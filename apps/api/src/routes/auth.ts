import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildSuccess } from "../lib/api-response";
import { withIdempotency } from "../lib/idempotent-handler";
import { idempotencyStore } from "../state";

const emptyBodySchema = z.object({}).passthrough();

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/auth/twitter/start", async (request, reply) => {
    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;

    await withIdempotency(request, reply, idempotencyStore, scope, emptyBodySchema.parse(request.body ?? {}), async () => {
      const data = {
        authUrl: "https://x.com/i/oauth2/authorize?client_id=demo&state=fokusfeed",
        state: "fokusfeed"
      };

      return {
        statusCode: 200,
        body: buildSuccess(request.requestId, data)
      };
    });
  });

  app.get("/v1/auth/twitter/callback", async (_request, reply) => {
    reply.redirect("/onboarding?twitter=connected", 302);
  });
}
