import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildError, buildSuccess } from "../lib/api-response";
import { withIdempotency } from "../lib/idempotent-handler";
import { store } from "../store/in-memory";
import { idempotencyStore } from "../state";
import { API_ERROR_CODES } from "../types";

const rssInputSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(120).optional()
});

export async function sourceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/sources", async (request) => {
    return buildSuccess(request.requestId, { items: store.listSources() });
  });

  app.post("/v1/sources/rss", async (request, reply) => {
    const parsed = rssInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid RSS source payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;

    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      const source = store.addRssSource(parsed.data.url, parsed.data.title);
      return {
        statusCode: 201,
        body: buildSuccess(request.requestId, source)
      };
    });
  });
}
