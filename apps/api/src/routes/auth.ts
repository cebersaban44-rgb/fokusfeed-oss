import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildError, buildSuccess } from "../lib/api-response";
import { decryptValue, encryptValue, hashValue } from "../lib/crypto";
import { withIdempotency } from "../lib/idempotent-handler";
import { createCodeChallenge, createCodeVerifier, createOAuthState } from "../lib/pkce";
import { exchangeCodeForTwitterToken, TwitterOAuthExchangeError } from "../lib/twitter-oauth-client";
import { store } from "../store/in-memory";
import { idempotencyStore } from "../state";
import { API_ERROR_CODES } from "../types";

const emptyBodySchema = z.object({}).passthrough();
const callbackQuerySchema = z.object({
  state: z.string().min(8),
  code: z.string().min(1).optional(),
  error: z.string().optional(),
  error_description: z.string().optional()
});

interface AuthRouteOptions {
  encryptionKey: string;
  webAppUrl: string;
  now?: () => Date;
  twitter: {
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    scopes: string;
    authorizeUrl: string;
    tokenUrl: string;
    stateTtlSeconds: number;
    oauthMock: boolean;
  };
}

function buildTwitterAuthorizeUrl(
  options: AuthRouteOptions["twitter"],
  state: string,
  codeChallenge: string
): string {
  const url = new URL(options.authorizeUrl);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    scope: options.scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });

  url.search = params.toString();
  return url.toString();
}

export async function authRoutes(app: FastifyInstance, options: AuthRouteOptions): Promise<void> {
  const now = options.now ?? (() => new Date());
  const onboardingRedirectUrl = new URL("/onboarding?twitter=connected", options.webAppUrl).toString();

  app.post("/v1/auth/twitter/start", async (request, reply) => {
    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;

    await withIdempotency(request, reply, idempotencyStore, scope, emptyBodySchema.parse(request.body ?? {}), async () => {
      const oauthState = createOAuthState();
      const codeVerifier = createCodeVerifier();
      const codeChallenge = createCodeChallenge(codeVerifier);
      const expiresAt = new Date(now().getTime() + options.twitter.stateTtlSeconds * 1000).toISOString();

      store.createOAuthStateSession({
        tenantId: request.authContext!.tenantId,
        userId: request.authContext!.userId,
        stateHash: hashValue(oauthState),
        codeVerifierCiphertext: encryptValue(codeVerifier, options.encryptionKey),
        expiresAt
      });

      const data = {
        authUrl: buildTwitterAuthorizeUrl(options.twitter, oauthState, codeChallenge),
        state: oauthState,
        expiresAt
      };

      return {
        statusCode: 200,
        body: buildSuccess(request.requestId, data)
      };
    });
  });

  app.get("/v1/auth/twitter/callback", async (request, reply) => {
    const parsed = callbackQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid callback query"));
    }

    if (parsed.data.error) {
      return reply.status(502).send(
        buildError(request.requestId, API_ERROR_CODES.UPSTREAM_PROVIDER_ERROR, "Twitter OAuth callback returned error", {
          error: parsed.data.error,
          errorDescription: parsed.data.error_description
        })
      );
    }

    if (!parsed.data.code) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Missing authorization code"));
    }

    const session = store.consumeOAuthStateSession(hashValue(parsed.data.state));
    if (!session) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid or expired state"));
    }

    const codeVerifier = decryptValue(session.codeVerifierCiphertext, options.encryptionKey);

    let token;
    try {
      token = await exchangeCodeForTwitterToken({
        tokenUrl: options.twitter.tokenUrl,
        clientId: options.twitter.clientId,
        clientSecret: options.twitter.clientSecret,
        redirectUri: options.twitter.redirectUri,
        code: parsed.data.code,
        codeVerifier,
        mock: options.twitter.oauthMock
      });
    } catch (error) {
      if (error instanceof TwitterOAuthExchangeError) {
        return reply.status(502).send(
          buildError(
            request.requestId,
            API_ERROR_CODES.UPSTREAM_PROVIDER_ERROR,
            "Twitter token exchange failed",
            error.details
          )
        );
      }

      throw error;
    }

    const nowDate = now();
    store.setTwitterToken(session.tenantId, session.userId, {
      accessTokenCiphertext: encryptValue(token.access_token, options.encryptionKey),
      ...(token.refresh_token
        ? { refreshTokenCiphertext: encryptValue(token.refresh_token, options.encryptionKey) }
        : {}),
      tokenType: token.token_type,
      scope: token.scope,
      createdAt: nowDate.toISOString(),
      ...(token.expires_in ? { expiresAt: new Date(nowDate.getTime() + token.expires_in * 1000).toISOString() } : {})
    });

    reply.redirect(onboardingRedirectUrl, 302);
  });
}
