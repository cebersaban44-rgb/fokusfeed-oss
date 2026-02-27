import Fastify from "fastify";
import { loadEnv } from "@fokusfeed/config";
import { createRedisConnection, createQueues, queueNames } from "./queues";
import { createWorkers } from "./processors";

async function main() {
  const env = loadEnv(process.env);
  const connection = createRedisConnection(env.REDIS_URL);

  const queues = createQueues(connection);
  const workers = createWorkers(connection);

  const metrics = Fastify({ logger: false });
  metrics.get("/health", async () => ({ ok: true, workers: workers.length }));

  await metrics.listen({ host: "0.0.0.0", port: env.WORKER_METRICS_PORT });

  await queues[queueNames.ingest].add("bootstrap", {
    id: "bootstrap-1",
    content_id: "feed-1",
    user_id: "user-demo"
  });

  console.log(`Worker metrics on http://localhost:${env.WORKER_METRICS_PORT}`);

  const shutdown = async () => {
    await Promise.all(workers.map((worker) => worker.close()));
    await Promise.all(Object.values(queues).map((queue) => queue.close()));
    await connection.quit();
    await metrics.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
