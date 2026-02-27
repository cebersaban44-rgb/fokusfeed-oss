import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildError, buildSuccess } from "../lib/api-response";
import { withIdempotency } from "../lib/idempotent-handler";
import { store } from "../store/in-memory";
import { idempotencyStore } from "../state";
import { API_ERROR_CODES } from "../types";

const saveBodySchema = z.object({
  itemId: z.string().min(1),
  title: z.string().min(1).optional(),
  summaryShort: z.string().min(1).optional(),
  topics: z.array(z.string().min(1)).optional()
});

const listSavedQuerySchema = z.object({
  query: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const patchSavedSchema = z
  .object({
    title: z.string().min(1).optional(),
    summaryShort: z.string().min(1).optional(),
    personalImportance: z.number().min(0).max(1).optional(),
    revisitScore: z.number().min(0).max(1).optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

const noteSchema = z.object({ note: z.string().min(1).max(2000) });

const askSchema = z.object({
  query: z.string().min(3),
  topK: z.number().int().min(1).max(50).default(20),
  filters: z
    .object({
      source: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional()
    })
    .optional()
});

const remindSchema = z.object({ when: z.string().datetime().optional() }).default({});

export async function savedRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/saved", async (request, reply) => {
    const parsed = saveBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid saved payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;
    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      const saved = store.saveItem(request.authContext!.tenantId, request.authContext!.userId, parsed.data);
      return {
        statusCode: 201,
        body: buildSuccess(request.requestId, saved)
      };
    });
  });

  app.get("/v1/saved", async (request, reply) => {
    const parsed = listSavedQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid saved query"));
    }

    const page = store.listSaved(
      request.authContext!.tenantId,
      request.authContext!.userId,
      parsed.data.query,
      parsed.data.cursor,
      parsed.data.limit
    );

    return buildSuccess(request.requestId, page);
  });

  app.get("/v1/saved/review/weekly", async (request) => {
    const data = store.generateWeeklyReview(request.authContext!.tenantId, request.authContext!.userId);
    return buildSuccess(request.requestId, data);
  });

  app.post("/v1/saved/ask", async (request, reply) => {
    const parsed = askSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid ask payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;

    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      const startedAt = Date.now();
      const generationMode = store.getGenerationMode(request.authContext!.tenantId, request.authContext!.userId);

      if (generationMode === "llm" && parsed.data.query.includes("[provider-error]")) {
        return {
          statusCode: 503,
          body: buildError(
            request.requestId,
            API_ERROR_CODES.UPSTREAM_PROVIDER_ERROR,
            "Provider temporarily unavailable"
          )
        };
      }

      const result = store.askSaved(
        request.authContext!.tenantId,
        request.authContext!.userId,
        parsed.data.query,
        parsed.data.topK
      );

      return {
        statusCode: 200,
        body: buildSuccess(
          request.requestId,
          {
            answer:
              generationMode === "llm"
                ? `LLM answer (mocked): ${result.answer}`
                : `Deterministic answer: ${result.answer}`,
            citations: result.citations,
            latencyMs: Date.now() - startedAt
          },
          generationMode
        )
      };
    });
  });

  app.get("/v1/saved/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const item = store.getSavedById(request.authContext!.tenantId, request.authContext!.userId, params.id);

    if (!item) {
      return reply
        .status(404)
        .send(buildError(request.requestId, API_ERROR_CODES.NOT_FOUND, "Saved item not found"));
    }

    return buildSuccess(request.requestId, item);
  });

  app.patch("/v1/saved/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = patchSavedSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid patch payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;
    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      const item = store.patchSaved(request.authContext!.tenantId, request.authContext!.userId, params.id, parsed.data);
      if (!item) {
        return {
          statusCode: 404,
          body: buildError(request.requestId, API_ERROR_CODES.NOT_FOUND, "Saved item not found")
        };
      }

      return {
        statusCode: 200,
        body: buildSuccess(request.requestId, item)
      };
    });
  });

  app.post("/v1/saved/:id/note", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = noteSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid note payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;
    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      const item = store.getSavedById(request.authContext!.tenantId, request.authContext!.userId, params.id);
      if (!item) {
        return {
          statusCode: 404,
          body: buildError(request.requestId, API_ERROR_CODES.NOT_FOUND, "Saved item not found")
        };
      }

      const note = store.addSavedNote(params.id, parsed.data.note);
      return {
        statusCode: 201,
        body: buildSuccess(request.requestId, note)
      };
    });
  });

  app.post("/v1/saved/:id/remind", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = remindSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid remind payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;
    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      const item = store.getSavedById(request.authContext!.tenantId, request.authContext!.userId, params.id);
      if (!item) {
        return {
          statusCode: 404,
          body: buildError(request.requestId, API_ERROR_CODES.NOT_FOUND, "Saved item not found")
        };
      }

      return {
        statusCode: 202,
        body: buildSuccess(request.requestId, {
          accepted: true,
          scheduledAt: parsed.data.when ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      };
    });
  });
}
