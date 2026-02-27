import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizeSessionMode, validateSessionMode } from "@fokusfeed/domain";
import { buildError, buildSuccess } from "../lib/api-response";
import { withIdempotency } from "../lib/idempotent-handler";
import { store } from "../store/in-memory";
import { idempotencyStore } from "../state";
import { API_ERROR_CODES } from "../types";

const sessionStartSchema = z.object({ modeMinutes: z.number().int().optional() }).default({});
const sessionEndSchema = z.object({ sessionId: z.string().min(1) });

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/session/start", async (request, reply) => {
    const parsed = sessionStartSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid session start payload"));
    }

    const mode = parsed.data.modeMinutes !== undefined ? parsed.data.modeMinutes : 15;
    if (!validateSessionMode(mode)) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Only 10 or 15 minute modes allowed"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;
    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      const session = store.startSession(
        request.authContext!.tenantId,
        request.authContext!.userId,
        normalizeSessionMode(parsed.data.modeMinutes)
      );

      return {
        statusCode: 201,
        body: buildSuccess(request.requestId, session)
      };
    });
  });

  app.post("/v1/session/end", async (request, reply) => {
    const parsed = sessionEndSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid session end payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;
    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      const result = store.endSession(parsed.data.sessionId);
      if (!result) {
        return {
          statusCode: 404,
          body: buildError(request.requestId, API_ERROR_CODES.NOT_FOUND, "Session not found")
        };
      }

      return {
        statusCode: 200,
        body: buildSuccess(request.requestId, {
          sessionId: result.session.id,
          endedAt: result.session.endedAt,
          timeSavedMs: result.timeSavedMs
        })
      };
    });
  });

  app.get("/v1/metrics/time-saved", async (request) => {
    const data = store.getTimeSavedSummary(request.authContext!.tenantId, request.authContext!.userId);
    return buildSuccess(request.requestId, data);
  });
}
