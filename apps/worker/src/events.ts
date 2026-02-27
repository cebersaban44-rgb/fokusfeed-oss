import { randomUUID } from "node:crypto";
import type { EventEnvelope, EventType } from "@fokusfeed/shared-types";

export function createEventEnvelope<TPayload>(
  eventType: EventType,
  producer: string,
  partitionKey: string,
  dedupeKey: string,
  payload: TPayload
): EventEnvelope<TPayload> {
  return {
    event_id: randomUUID(),
    event_type: eventType,
    event_version: "v1",
    occurred_at: new Date().toISOString(),
    producer,
    partition_key: partitionKey,
    dedupe_key: dedupeKey,
    payload
  };
}
