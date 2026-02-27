import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildError, buildSuccess } from "../lib/api-response";
import { encryptValue, fingerprintSecret } from "../lib/crypto";
import { withIdempotency } from "../lib/idempotent-handler";
import { store } from "../store/in-memory";
import { idempotencyStore } from "../state";
import { API_ERROR_CODES } from "../types";

interface ProfileRouteOptions {
  encryptionKey: string;
  readBudgetWindow?: string;
}

const llmKeySchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "groq"]),
  apiKey: z.string().min(20)
});

export async function profileRoutes(app: FastifyInstance, options: ProfileRouteOptions): Promise<void> {
  const readBudgetWindow = options.readBudgetWindow ?? "10m";

  app.get("/v1/profile/interests", async (request) => {
    const data = store.getProfileInterests(request.authContext!.tenantId, request.authContext!.userId);
    return buildSuccess(request.requestId, { items: data });
  });

  app.get("/v1/profile/source-trust-graph", async (request) => {
    return buildSuccess(request.requestId, { items: store.getSourceTrustGraph() });
  });

  app.get("/v1/profile/twitter/status", async (request) => {
    const status = store.getTwitterConnectionStatus(request.authContext!.tenantId, request.authContext!.userId);
    return buildSuccess(request.requestId, {
      connected: status.connected,
      ...(status.lastSyncAt ? { lastSyncAt: status.lastSyncAt } : {}),
      readBudget: {
        used: 0,
        remaining: 100,
        window: readBudgetWindow
      }
    });
  });

  app.get("/v1/profile/llm-key/status", async (request) => {
    const key = store.getLlmKey(request.authContext!.tenantId, request.authContext!.userId);
    return buildSuccess(request.requestId, {
      configured: Boolean(key && !key.revokedAt),
      provider: key?.provider ?? null,
      fingerprint: key?.fingerprint ?? null
    });
  });

  app.post("/v1/profile/llm-key", async (request, reply) => {
    const parsed = llmKeySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid LLM key payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;
    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      const fingerprint = fingerprintSecret(parsed.data.apiKey);
      const keyCiphertext = encryptValue(parsed.data.apiKey, options.encryptionKey);

      store.setLlmKey(request.authContext!.tenantId, request.authContext!.userId, {
        provider: parsed.data.provider,
        keyCiphertext,
        fingerprint,
        createdAt: new Date().toISOString()
      });

      return {
        statusCode: 201,
        body: buildSuccess(request.requestId, {
          stored: true,
          provider: parsed.data.provider,
          fingerprint
        })
      };
    });
  });

  app.delete("/v1/profile/llm-key", async (request, reply) => {
    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;
    await withIdempotency(request, reply, idempotencyStore, scope, {}, async () => {
      const removed = store.revokeLlmKey(request.authContext!.tenantId, request.authContext!.userId);

      if (!removed) {
        return {
          statusCode: 404,
          body: buildError(request.requestId, API_ERROR_CODES.NOT_FOUND, "No active key")
        };
      }

      return {
        statusCode: 204,
        body: undefined
      };
    });
  });
}
