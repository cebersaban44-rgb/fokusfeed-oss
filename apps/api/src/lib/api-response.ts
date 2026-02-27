import type { ApiError, ApiSuccess, GenerationMode } from "@fokusfeed/shared-types";
import type { ApiErrorCode } from "../types";

export function buildSuccess<T>(requestId: string, data: T, generationMode?: GenerationMode): ApiSuccess<T> {
  return {
    ok: true,
    requestId,
    data,
    ...(generationMode ? { meta: { generationMode } } : {})
  };
}

export function buildError(
  requestId: string,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    ok: false,
    requestId,
    code,
    message,
    ...(details ? { details } : {})
  };
}
