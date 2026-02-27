import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3001),
  WEB_PORT: z.coerce.number().default(3000),
  WORKER_METRICS_PORT: z.coerce.number().default(3002),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/fokusfeed"),
  APP_ENCRYPTION_KEY: z.string().min(32).default("dev-key-please-replace-with-32-char-min"),
  TWITTER_CLIENT_ID: z.string().min(1).default("demo-client-id"),
  TWITTER_CLIENT_SECRET: z.string().default(""),
  TWITTER_REDIRECT_URI: z.string().url().default("http://localhost:3001/v1/auth/twitter/callback"),
  TWITTER_SCOPES: z.string().min(1).default("tweet.read users.read like.read follows.read offline.access"),
  TWITTER_AUTHORIZE_URL: z.string().url().default("https://x.com/i/oauth2/authorize"),
  TWITTER_TOKEN_URL: z.string().url().default("https://api.x.com/2/oauth2/token"),
  TWITTER_STATE_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  TWITTER_OAUTH_MOCK: booleanFromString.default("false")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(input: Record<string, string | undefined> = process.env): AppEnv {
  return envSchema.parse(input);
}
