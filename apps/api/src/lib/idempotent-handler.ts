import type { FastifyReply, FastifyRequest } from "fastify";
import { buildError } from "./api-response";
import { IdempotencyStore } from "./idempotency";
import { API_ERROR_CODES } from "../types";

export async function withIdempotency(
  request: FastifyRequest,
  reply: FastifyReply,
  store: IdempotencyStore,
  scope: string,
  payload: unknown,
  handler: () => Promise<{ statusCode: number; body: unknown }> | { statusCode: number; body: unknown }
): Promise<boolean> {
  const idempotencyKey = request.headers["idempotency-key"] as string | undefined;
  if (!idempotencyKey) {
    reply
      .status(400)
      .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Idempotency-Key header is required"));
    return true;
  }

  const payloadHash = IdempotencyStore.hashPayload(payload);
  const check = store.check(scope, idempotencyKey, payloadHash);

  if (check.type === "conflict") {
    reply
      .status(409)
      .send(buildError(request.requestId, API_ERROR_CODES.CONFLICT_IDEMPOTENCY, "Conflicting idempotency key"));
    return true;
  }

  if (check.type === "replay") {
    reply.status(check.statusCode).send(check.body);
    return true;
  }

  const result = await handler();
  store.store(scope, idempotencyKey, payloadHash, result.statusCode, result.body);
  reply.status(result.statusCode).send(result.body);
  return true;
}
