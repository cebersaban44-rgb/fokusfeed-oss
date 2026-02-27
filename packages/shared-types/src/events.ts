export interface EventEnvelope<TPayload = Record<string, unknown>> {
  event_id: string;
  event_type: string;
  event_version: "v1";
  occurred_at: string;
  producer: string;
  partition_key: string;
  dedupe_key: string;
  payload: TPayload;
}

export const eventTypes = [
  "content.ingested",
  "content.clustered",
  "content.features.built",
  "ranking.completed",
  "digest.generated",
  "user.signal.updated",
  "saved.created",
  "saved.enriched",
  "saved.review.generated",
  "policy.session.completed",
  "trust.updated",
  "agent.profile.refined"
] as const;

export type EventType = (typeof eventTypes)[number];

export const QUEUE_RETRY_POLICY = {
  attempts: 3,
  backoff: ["30s", "2m", "10m"],
  dlq: true
} as const;
