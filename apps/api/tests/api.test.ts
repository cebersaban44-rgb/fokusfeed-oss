import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { encryptValue } from "../src/lib/crypto";
import { store } from "../src/store/in-memory";

process.env.TWITTER_OAUTH_MOCK = "true";

const authHeaders = {
  "x-tenant-id": "tenant-demo",
  "x-user-id": "user-demo"
};

describe("API integration", () => {
  const app = createApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without auth context", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/feed?mode=digest" });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("AUTH_UNAUTHORIZED");
  });

  it("requires connected twitter account for feed", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/feed?mode=digest&limit=10",
      headers: authHeaders
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("TWITTER_CONNECTION_REQUIRED");
  });

  it("enforces write idempotency conflicts", async () => {
    const payloadA = { itemId: "feed-1", title: "A" };
    const payloadB = { itemId: "feed-2", title: "B" };

    const first = await app.inject({
      method: "POST",
      url: "/v1/saved",
      headers: {
        ...authHeaders,
        "idempotency-key": "save-key-1"
      },
      payload: payloadA
    });

    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: "POST",
      url: "/v1/saved",
      headers: {
        ...authHeaders,
        "idempotency-key": "save-key-1"
      },
      payload: payloadB
    });

    expect(second.statusCode).toBe(409);
    expect(second.json().code).toBe("CONFLICT_IDEMPOTENCY");
  });

  it("starts twitter oauth with PKCE state session", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/twitter/start",
      headers: {
        ...authHeaders,
        "idempotency-key": "twitter-oauth-start-1"
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.data.state).toBe("string");
    expect(body.data.state.length).toBeGreaterThan(12);
    expect(typeof body.data.expiresAt).toBe("string");
    expect(body.data.authUrl).toContain("code_challenge=");
    expect(body.data.authUrl).toContain(`state=${encodeURIComponent(body.data.state)}`);
  });

  it("connects twitter account after valid callback state", async () => {
    const start = await app.inject({
      method: "POST",
      url: "/v1/auth/twitter/start",
      headers: {
        ...authHeaders,
        "idempotency-key": "twitter-oauth-start-2"
      }
    });

    expect(start.statusCode).toBe(200);
    const state = start.json().data.state as string;

    const callback = await app.inject({
      method: "GET",
      url: `/v1/auth/twitter/callback?state=${encodeURIComponent(state)}&code=demo-auth-code`
    });

    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toBe("http://localhost:3000/onboarding?twitter=connected");

    const status = await app.inject({
      method: "GET",
      url: "/v1/profile/twitter/status",
      headers: authHeaders
    });

    expect(status.statusCode).toBe(200);
    expect(status.json().data.connected).toBe(true);
  });

  it("rejects callback with invalid oauth state", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/auth/twitter/callback?state=invalid-state-value&code=demo-auth-code"
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("VALIDATION_ERROR");
  });

  it("returns twitter-backed feed when a twitter token is available", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "u-1",
            name: "Demo User",
            username: "demouser"
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "tweet-1",
              text: "Twitter feed item from integration test",
              author_id: "u-1",
              created_at: "2026-02-27T00:00:00.000Z",
              public_metrics: {
                like_count: 12,
                retweet_count: 3,
                reply_count: 2,
                quote_count: 1
              }
            }
          ],
          includes: {
            users: [
              {
                id: "u-1",
                name: "Demo User",
                username: "demouser"
              }
            ]
          }
        })
      });

    globalThis.fetch = fetchMock as typeof fetch;

    store.setTwitterToken("tenant-demo", "user-demo", {
      accessTokenCiphertext: encryptValue("real-twitter-token", "dev-key-please-replace-with-32-char-min"),
      tokenType: "bearer",
      createdAt: new Date().toISOString()
    });

    const res = await app.inject({
      method: "GET",
      url: "/v1/feed?mode=live&limit=10",
      headers: authHeaders
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.items[0].source).toBe("twitter");
    expect(body.data.items[0].id).toBe("tw-tweet-1");

    store.setTwitterToken("tenant-demo", "user-demo", {
      accessTokenCiphertext: encryptValue("real-twitter-token", "dev-key-please-replace-with-32-char-min"),
      tokenType: "bearer",
      createdAt: new Date().toISOString(),
      revokedAt: new Date().toISOString()
    });

    globalThis.fetch = originalFetch;
  });

  it("switches saved/ask generation mode after BYOK key", async () => {
    const storeKey = await app.inject({
      method: "POST",
      url: "/v1/profile/llm-key",
      headers: {
        ...authHeaders,
        "idempotency-key": "llm-key-1"
      },
      payload: {
        provider: "openai",
        apiKey: "sk-demo-12345678901234567890"
      }
    });

    expect(storeKey.statusCode).toBe(201);

    const ask = await app.inject({
      method: "POST",
      url: "/v1/saved/ask",
      headers: {
        ...authHeaders,
        "idempotency-key": "ask-1"
      },
      payload: {
        query: "node release",
        topK: 20
      }
    });

    expect(ask.statusCode).toBe(200);
    expect(ask.json().meta.generationMode).toBe("llm");
  });

  it("rejects invalid session mode", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/session/start",
      headers: {
        ...authHeaders,
        "idempotency-key": "session-start-1"
      },
      payload: { modeMinutes: 20 }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("VALIDATION_ERROR");
  });
});
