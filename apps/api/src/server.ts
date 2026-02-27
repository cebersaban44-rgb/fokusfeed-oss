import { resolve } from "node:path";
import { loadEnv } from "@fokusfeed/config";
import { createApp } from "./app";
import { loadProcessEnvFromFiles } from "./lib/env-file";

async function main() {
  loadProcessEnvFromFiles([resolve(process.cwd(), ".env"), resolve(process.cwd(), "apps/api/.env")]);
  const env = loadEnv(process.env);
  const app = createApp();

  try {
    await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
    console.log(`API running on http://localhost:${env.API_PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
