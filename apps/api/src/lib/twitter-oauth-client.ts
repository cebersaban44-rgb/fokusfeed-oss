import { randomUUID } from "node:crypto";

export interface TwitterTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export class TwitterOAuthExchangeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TwitterOAuthExchangeError";
  }
}

interface ExchangeCodeInput {
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
  mock: boolean;
}

function buildMockTokenResponse(code: string): TwitterTokenResponse {
  const suffix = code.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || randomUUID().slice(0, 12);

  return {
    access_token: `mock-access-${suffix}`,
    refresh_token: `mock-refresh-${suffix}`,
    token_type: "bearer",
    expires_in: 7200,
    scope: "tweet.read users.read follows.read like.read offline.access"
  };
}

export async function exchangeCodeForTwitterToken(input: ExchangeCodeInput): Promise<TwitterTokenResponse> {
  if (input.mock && process.env.NODE_ENV === "test") {
    return buildMockTokenResponse(input.code);
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
    client_id: input.clientId
  });

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json"
  };

  if (input.clientSecret) {
    headers.authorization = `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`;
  }

  const response = await fetch(input.tokenUrl, {
    method: "POST",
    headers,
    body: params.toString()
  });

  const raw = (await response.json().catch(() => null)) as
    | TwitterTokenResponse
    | { error?: string; error_description?: string }
    | null;

  if (!response.ok || !raw || typeof raw !== "object" || !("access_token" in raw)) {
    const details =
      raw && typeof raw === "object"
        ? {
            error: "error" in raw ? raw.error : undefined,
            errorDescription: "error_description" in raw ? raw.error_description : undefined
          }
        : undefined;

    throw new TwitterOAuthExchangeError("Twitter token exchange failed", response.status, details);
  }

  return raw;
}
