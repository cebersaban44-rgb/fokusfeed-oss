import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

export const queueNames = {
  ingest: "content-ingest",
  feature: "content-feature",
  ranking: "content-ranking",
  saved: "saved-enrichment",
  review: "saved-review",
  policy: "policy-session",
  trust: "source-trust",
  dlq: "dead-letter"
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

export function createDefaultJobOptions(): JobsOptions {
  return {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30_000
    },
    removeOnComplete: 100,
    removeOnFail: 1_000
  };
}

export function createRedisConnection(redisUrl: string): IORedis {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
}

export function createQueues(connection: IORedis): Record<QueueName, Queue> {
  const defaults = createDefaultJobOptions();

  return {
    [queueNames.ingest]: new Queue(queueNames.ingest, { connection, defaultJobOptions: defaults }),
    [queueNames.feature]: new Queue(queueNames.feature, { connection, defaultJobOptions: defaults }),
    [queueNames.ranking]: new Queue(queueNames.ranking, { connection, defaultJobOptions: defaults }),
    [queueNames.saved]: new Queue(queueNames.saved, { connection, defaultJobOptions: defaults }),
    [queueNames.review]: new Queue(queueNames.review, { connection, defaultJobOptions: defaults }),
    [queueNames.policy]: new Queue(queueNames.policy, { connection, defaultJobOptions: defaults }),
    [queueNames.trust]: new Queue(queueNames.trust, { connection, defaultJobOptions: defaults }),
    [queueNames.dlq]: new Queue(queueNames.dlq, { connection, defaultJobOptions: defaults })
  };
}
