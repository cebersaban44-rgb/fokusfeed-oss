import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadEnv } from "@fokusfeed/config";
import { buildError } from "./lib/api-response";
import { resolveRateLimit } from "./lib/rate-limit";
import { authRoutes } from "./routes/auth";
import { feedRoutes } from "./routes/feed";
import { healthRoutes } from "./routes/health";
import { profileRoutes } from "./routes/profile";
import { savedRoutes } from "./routes/saved";
import { sessionRoutes } from "./routes/session";
import { sourceRoutes } from "./routes/sources";
import { rateLimiter } from "./state";
import { API_ERROR_CODES, type AppOptions } from "./types";

export function createApp(options: AppOptions = {}) {
  const app = Fastify({ logger: false });
  const env = loadEnv(process.env);
  const now = options.now ?? (() => new Date());

  app.register(cors, {
    origin: true
  });

  app.addHook("onRequest", async (request, reply) => {
    request.requestId = randomUUID();
    reply.header("x-request-id", request.requestId);
  });

  app.addHook("preHandler", async (request, reply) => {
    if (request.url === "/health") {
      return;
    }

    if (!request.url.startsWith("/v1")) {
      return;
    }

    if (request.url.startsWith("/v1/auth/twitter/callback")) {
      return;
    }

    const tenantId = request.headers["x-tenant-id"] as string | undefined;
    const userId = request.headers["x-user-id"] as string | undefined;

    if (!tenantId || !userId) {
      return reply
        .status(401)
        .send(buildError(request.requestId, API_ERROR_CODES.AUTH_UNAUTHORIZED, "Missing auth context"));
    }

    request.authContext = { tenantId, userId };

    const normalizedPath = request.url.split("?")[0];
    const maxPerMinute = resolveRateLimit(request.method, normalizedPath);
    const allowed = rateLimiter.consume(
      `${tenantId}:${userId}`,
      `${request.method}:${normalizedPath}`,
      maxPerMinute,
      now()
    );
    if (!allowed) {
      return reply
        .status(429)
        .send(buildError(request.requestId, API_ERROR_CODES.RATE_LIMITED, "Rate limit exceeded"));
    }

    const isWrite = ["POST", "PATCH", "DELETE"].includes(request.method);
    if (isWrite) {
      const idempotencyKey = request.headers["idempotency-key"] as string | undefined;
      if (!idempotencyKey) {
        return reply
          .status(400)
          .send(
            buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Idempotency-Key header is required")
          );
      }
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (reply.sent) {
      return;
    }

    request.log.error(error);

    reply
      .status(500)
      .send(buildError(request.requestId ?? randomUUID(), API_ERROR_CODES.INTERNAL_ERROR, "Unhandled server error"));
  });

  app.register(healthRoutes);
  app.register(authRoutes, {
    encryptionKey: env.APP_ENCRYPTION_KEY,
    webAppUrl: `http://localhost:${env.WEB_PORT}`,
    now,
    twitter: {
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET || undefined,
      redirectUri: env.TWITTER_REDIRECT_URI,
      scopes: env.TWITTER_SCOPES,
      authorizeUrl: env.TWITTER_AUTHORIZE_URL,
      tokenUrl: env.TWITTER_TOKEN_URL,
      stateTtlSeconds: env.TWITTER_STATE_TTL_SECONDS,
      oauthMock: env.TWITTER_OAUTH_MOCK
    }
  });
  app.register(sourceRoutes);
  app.register(feedRoutes);
  app.register(savedRoutes);
  app.register(profileRoutes, { encryptionKey: env.APP_ENCRYPTION_KEY });
  app.register(sessionRoutes);

  return app;
}
