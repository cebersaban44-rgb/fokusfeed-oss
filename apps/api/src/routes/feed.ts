import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildError, buildSuccess } from "../lib/api-response";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { decryptValue } from "../lib/crypto";
import { withIdempotency } from "../lib/idempotent-handler";
import { fetchTwitterFeedItems, TwitterFeedError } from "../lib/twitter-feed";
import { store } from "../store/in-memory";
import { idempotencyStore } from "../state";
import { API_ERROR_CODES } from "../types";

const feedQuerySchema = z.object({
  mode: z.enum(["digest", "live"]),
  category: z.enum(["following", "similar_likes", "must_see", "trend_now"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const feedbackBodySchema = z.object({
  itemId: z.string().min(1),
  action: z.enum(["like", "dislike", "save", "mute_topic", "open", "skip"]),
  contextMode: z.enum(["digest", "live"]),
  contextCategory: z.enum(["following", "similar_likes", "must_see", "trend_now"]).optional(),
  ts: z.string().datetime()
});

interface FeedRouteOptions {
  encryptionKey: string;
}

function paginateItems<T>(items: T[], cursor: string | undefined, limit: number): { items: T[]; nextCursor?: string } {
  const offset = decodeCursor(cursor);
  const page = items.slice(offset, offset + limit);
  const nextOffset = offset + page.length;

  return {
    items: page,
    ...(nextOffset < items.length ? { nextCursor: encodeCursor(nextOffset) } : {})
  };
}

function statusCodeForTwitterError(code: string): number {
  if (code === API_ERROR_CODES.TWITTER_CONNECTION_REQUIRED) {
    return 403;
  }

  if (code === API_ERROR_CODES.TWITTER_TOKEN_EXPIRED) {
    return 401;
  }

  if (code === API_ERROR_CODES.TWITTER_SCOPE_MISSING) {
    return 403;
  }

  if (code === API_ERROR_CODES.TWITTER_RATE_LIMITED) {
    return 429;
  }

  return 502;
}

export async function feedRoutes(app: FastifyInstance, options: FeedRouteOptions): Promise<void> {
  app.get("/v1/feed", async (request, reply) => {
    const parsed = feedQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid feed query"));
    }

    const { mode, category, cursor, limit } = parsed.data;
    const generationMode = store.getGenerationMode(request.authContext!.tenantId, request.authContext!.userId);

    const twitterToken = store.getTwitterToken(request.authContext!.tenantId, request.authContext!.userId);
    if (!twitterToken || twitterToken.revokedAt) {
      return reply.status(statusCodeForTwitterError(API_ERROR_CODES.TWITTER_CONNECTION_REQUIRED)).send(
        buildError(
          request.requestId,
          API_ERROR_CODES.TWITTER_CONNECTION_REQUIRED,
          "Twitter account is not connected. Connect Twitter to load feed."
        )
      );
    }

    try {
      const accessToken = decryptValue(twitterToken.accessTokenCiphertext, options.encryptionKey);
      const twitterItems = await fetchTwitterFeedItems({
        accessToken,
        mode,
        limit: Math.min(limit * 2, 50),
        category
      });

      store.markTwitterSyncSuccess(request.authContext!.tenantId, request.authContext!.userId, new Date().toISOString());

      const page = paginateItems(twitterItems, cursor, limit);
      return buildSuccess(request.requestId, page, generationMode);
    } catch (error) {
      if (error instanceof TwitterFeedError) {
        store.markTwitterSyncError(
          request.authContext!.tenantId,
          request.authContext!.userId,
          error.code,
          new Date().toISOString()
        );

        return reply.status(statusCodeForTwitterError(error.code)).send(
          buildError(request.requestId, error.code, "Unable to load Twitter feed", {
            statusCode: error.statusCode,
            ...(error.details ?? {})
          })
        );
      }

      request.log.error({ err: error }, "Unhandled twitter feed fetch error");
      store.markTwitterSyncError(
        request.authContext!.tenantId,
        request.authContext!.userId,
        API_ERROR_CODES.TWITTER_FEED_UNAVAILABLE,
        new Date().toISOString()
      );

      return reply.status(statusCodeForTwitterError(API_ERROR_CODES.TWITTER_FEED_UNAVAILABLE)).send(
        buildError(
          request.requestId,
          API_ERROR_CODES.TWITTER_FEED_UNAVAILABLE,
          "Twitter feed is currently unavailable"
        )
      );
    }
  });

  app.get("/v1/digest/today", async (request, reply) => {
    const generationMode = store.getGenerationMode(request.authContext!.tenantId, request.authContext!.userId);
    const twitterToken = store.getTwitterToken(request.authContext!.tenantId, request.authContext!.userId);
    if (!twitterToken || twitterToken.revokedAt) {
      return reply.status(statusCodeForTwitterError(API_ERROR_CODES.TWITTER_CONNECTION_REQUIRED)).send(
        buildError(
          request.requestId,
          API_ERROR_CODES.TWITTER_CONNECTION_REQUIRED,
          "Twitter account is not connected. Connect Twitter to load digest."
        )
      );
    }

    try {
      const accessToken = decryptValue(twitterToken.accessTokenCiphertext, options.encryptionKey);
      const items = await fetchTwitterFeedItems({
        accessToken,
        mode: "digest",
        limit: 20
      });

      store.markTwitterSyncSuccess(request.authContext!.tenantId, request.authContext!.userId, new Date().toISOString());
      return buildSuccess(request.requestId, { items }, generationMode);
    } catch (error) {
      if (error instanceof TwitterFeedError) {
        store.markTwitterSyncError(
          request.authContext!.tenantId,
          request.authContext!.userId,
          error.code,
          new Date().toISOString()
        );

        return reply.status(statusCodeForTwitterError(error.code)).send(
          buildError(request.requestId, error.code, "Unable to load Twitter digest", {
            statusCode: error.statusCode,
            ...(error.details ?? {})
          })
        );
      }

      request.log.error({ err: error }, "Unhandled twitter digest fetch error");
      return reply.status(statusCodeForTwitterError(API_ERROR_CODES.TWITTER_FEED_UNAVAILABLE)).send(
        buildError(
          request.requestId,
          API_ERROR_CODES.TWITTER_FEED_UNAVAILABLE,
          "Twitter digest is currently unavailable"
        )
      );
    }
  });

  app.post("/v1/feedback", async (request, reply) => {
    const parsed = feedbackBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildError(request.requestId, API_ERROR_CODES.VALIDATION_ERROR, "Invalid feedback payload"));
    }

    const scope = `${request.authContext?.tenantId}:${request.authContext?.userId}:${request.url}`;

    await withIdempotency(request, reply, idempotencyStore, scope, parsed.data, async () => {
      store.addFeedback(request.authContext!.userId, parsed.data.itemId, parsed.data.action, parsed.data.ts);

      return {
        statusCode: 202,
        body: buildSuccess(request.requestId, { accepted: true })
      };
    });
  });
}
