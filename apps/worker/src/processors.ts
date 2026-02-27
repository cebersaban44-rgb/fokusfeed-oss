import { Worker, type Job } from "bullmq";
import type IORedis from "ioredis";
import { createEventEnvelope } from "./events";
import { queueNames } from "./queues";

type JsonObject = Record<string, unknown>;

async function processJob(job: Job<JsonObject>): Promise<JsonObject> {
  const payload = job.data;

  return {
    ...payload,
    processedAt: new Date().toISOString(),
    event: createEventEnvelope(
      "agent.profile.refined",
      "worker",
      String(payload.user_id ?? payload.content_id ?? "global"),
      String(payload.id ?? job.id ?? "unknown"),
      {
        user_id: String(payload.user_id ?? "unknown"),
        profile_version: 1,
        changes: ["processed"]
      }
    )
  };
}

export function createWorkers(connection: IORedis): Worker[] {
  const baseOptions = { connection, concurrency: 20 };

  return [
    new Worker(queueNames.ingest, processJob, baseOptions),
    new Worker(queueNames.feature, processJob, baseOptions),
    new Worker(queueNames.ranking, processJob, baseOptions),
    new Worker(queueNames.saved, processJob, baseOptions),
    new Worker(queueNames.review, processJob, baseOptions),
    new Worker(queueNames.policy, processJob, baseOptions),
    new Worker(queueNames.trust, processJob, baseOptions)
  ];
}
