import { createHash } from "node:crypto";

interface StoredResponse {
  payloadHash: string;
  statusCode: number;
  body: unknown;
}

export class IdempotencyStore {
  private responses = new Map<string, StoredResponse>();

  static hashPayload(payload: unknown): string {
    return createHash("sha256").update(JSON.stringify(payload ?? {})).digest("hex");
  }

  check(scope: string, idempotencyKey: string, payloadHash: string):
    | { type: "new" }
    | { type: "replay"; statusCode: number; body: unknown }
    | { type: "conflict" } {
    const key = `${scope}:${idempotencyKey}`;
    const existing = this.responses.get(key);

    if (!existing) {
      return { type: "new" };
    }

    if (existing.payloadHash !== payloadHash) {
      return { type: "conflict" };
    }

    return { type: "replay", statusCode: existing.statusCode, body: existing.body };
  }

  store(scope: string, idempotencyKey: string, payloadHash: string, statusCode: number, body: unknown): void {
    const key = `${scope}:${idempotencyKey}`;
    this.responses.set(key, { payloadHash, statusCode, body });
  }
}
