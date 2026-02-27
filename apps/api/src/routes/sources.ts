import type { FastifyInstance } from "fastify";
import { buildError, buildSuccess } from "../lib/api-response";
import { store } from "../store/in-memory";
import { API_ERROR_CODES } from "../types";

export async function sourceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/sources", async (request) => {
    return buildSuccess(request.requestId, { items: store.listSources() });
  });

  app.post("/v1/sources/rss", async (request, reply) => {
    return reply
      .status(403)
      .send(buildError(request.requestId, API_ERROR_CODES.AUTH_FORBIDDEN, "RSS sources are disabled in Twitter-only mode"));
  });
}
