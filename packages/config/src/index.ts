import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3001),
  WEB_PORT: z.coerce.number().default(3000),
  WORKER_METRICS_PORT: z.coerce.number().default(3002),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/fokusfeed"),
  APP_ENCRYPTION_KEY: z.string().min(32).default("dev-key-please-replace-with-32-char-min")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(input: Record<string, string | undefined> = process.env): AppEnv {
  return envSchema.parse(input);
}
