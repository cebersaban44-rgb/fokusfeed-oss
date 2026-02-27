import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildError, buildSuccess } from "../lib/api-response";
import { withIdempotency } from "../lib/idempotent-handler";
import { store } from "../store/in-memory";
import { idempotencyStore } from "../state";
import { API_ERROR_CODES } from "../types";

const feedQuerySchema = z.object({
  mode: z.enum(["digest", "live"]),
  category: z.enum(["following", "similar_likes", "must_see", "trend_now"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const feedbackBodySchema = z.object({
  itemId: z.string().min(1),
  action: z.enum(["like", "dislike", "save", "mute_topic", "open", "skip"]),
  contextMode: z.enum(["digest", "live"]),
  contextCategory: z.enum(["following", "similar_likes", "must_see", "trend_now"]).optional(),
  ts: z.string().datetime()
});

export async function feedRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/feed", async (request, reply) => {
    const parsed = feedQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid feed query"));
    }

    const { mode, category, cursor, limit } = parsed.data;
    const page = store.listFeed(mode, category, cursor, limit);
    const generationMode = store.getGenerationMode(request.authContext!.tenantId, request.authContext!.userId);

    return buildSuccess(request.requestId, page, generationMode);
  });

  app.get("/v1/digest/today", async (request) => {
    const generationMode = store.getGenerationMode(request.authContext!.tenantId, request.authContext!.userId);
    return buildSuccess(request.requestId, { items: store.getTodayDigest() }, generationMode);
  });

  app.post("/v1/feedback", async (request, reply) => {
    const parsed = feedbackBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid feedback payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;

    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      store.addFeedback(request.authContext!.userId, parsed.data.itemId, parsed.data.action, parsed.data.ts);

      return {
        statusCode: 202,
        body: buildSuccess(request.requestId, { accepted: true })
      };
    });
  });
}
