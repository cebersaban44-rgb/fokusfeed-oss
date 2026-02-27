import { loadEnv } from "@fokusfeed/config";
import { createApp } from "./app";

async function main() {
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
