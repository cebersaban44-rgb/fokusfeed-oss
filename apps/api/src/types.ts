import type { GenerationMode } from "@fokusfeed/shared-types";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
    authContext?: AuthContext;
    generationMode?: GenerationMode;
  }
}

export interface AuthContext {
  userId: string;
  tenantId: string;
}

export const API_ERROR_CODES = {
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  CONFLICT_IDEMPOTENCY: "CONFLICT_IDEMPOTENCY",
  UPSTREAM_PROVIDER_ERROR: "UPSTREAM_PROVIDER_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface AppOptions {
  now?: () => Date;
}
