import type { FeedCategory, FeedItem, TwitterFeedLink, TwitterFeedMedia } from "@fokusfeed/shared-types";

type TwitterFeedErrorCode =
  | "TWITTER_CREDITS_DEPLETED"
  | "TWITTER_SCOPE_MISSING"
  | "TWITTER_RATE_LIMITED"
  | "TWITTER_TOKEN_EXPIRED"
  | "TWITTER_FEED_UNAVAILABLE";

interface TwitterUser {
  id: string;
  name?: string;
  username?: string;
  profile_image_url?: string;
  verified?: boolean;
}

interface TwitterMedia {
  media_key: string;
  type?: string;
  url?: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
}

interface TwitterTweetUrlEntity {
  url: string;
  expanded_url?: string;
  display_url?: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  attachments?: {
    media_keys?: string[];
  };
  entities?: {
    urls?: TwitterTweetUrlEntity[];
  };
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
  };
}

interface TwitterApiErrorBody {
  title?: string;
  detail?: string;
  type?: string;
  errors?: Array<{ code?: number; message?: string }>;
}

interface TwitterListResponse<T> {
  data?: T[];
  includes?: {
    users?: TwitterUser[];
    media?: TwitterMedia[];
  };
}

interface TwitterSingleResponse<T> {
  data?: T;
}

interface FetchTwitterFeedInput {
  accessToken: string;
  mode: "digest" | "live";
  limit: number;
  category?: FeedCategory;
}

export class TwitterFeedError extends Error {
  constructor(
    public readonly code: TwitterFeedErrorCode,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TwitterFeedError";
  }
}

const TWITTER_API_BASE = "https://api.x.com";

function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function mapTwitterErrorCode(statusCode: number): TwitterFeedErrorCode {
  if (statusCode === 402) {
    return "TWITTER_CREDITS_DEPLETED";
  }

  if (statusCode === 401) {
    return "TWITTER_TOKEN_EXPIRED";
  }

  if (statusCode === 403) {
    return "TWITTER_SCOPE_MISSING";
  }

  if (statusCode === 429) {
    return "TWITTER_RATE_LIMITED";
  }

  return "TWITTER_FEED_UNAVAILABLE";
}

function normalizeMedia(media: TwitterMedia[] | undefined, mediaKeys: string[] | undefined): TwitterFeedMedia[] {
  if (!mediaKeys || mediaKeys.length === 0) {
    return [];
  }

  const byKey = new Map((media ?? []).map((entry) => [entry.media_key, entry]));

  return mediaKeys
    .map((mediaKey) => {
      const source = byKey.get(mediaKey);
      if (!source) {
        return {
          mediaKey,
          type: "unknown" as const
        };
      }

      const mediaType: TwitterFeedMedia["type"] =
        source.type === "photo" || source.type === "video" || source.type === "animated_gif"
          ? source.type
          : "unknown";

      return {
        mediaKey,
        type: mediaType,
        mediaUrl: source.url,
        previewImageUrl: source.preview_image_url,
        width: source.width,
        height: source.height
      };
    })
    .slice(0, 4);
}

function normalizeLinks(urls: TwitterTweetUrlEntity[] | undefined): TwitterFeedLink[] {
  if (!urls || urls.length === 0) {
    return [];
  }

  return urls
    .map((entry) => ({
      url: entry.url,
      expandedUrl: entry.expanded_url,
      displayUrl: entry.display_url
    }))
    .slice(0, 3);
}

function selectCategory(metrics: TwitterTweet["public_metrics"]): FeedCategory {
  const score =
    (metrics?.like_count ?? 0) +
    (metrics?.retweet_count ?? 0) * 2 +
    (metrics?.reply_count ?? 0) * 1.5 +
    (metrics?.quote_count ?? 0) * 2;

  if (score >= 40) {
    return "must_see";
  }

  if (score >= 10) {
    return "similar_likes";
  }

  return "following";
}

function toFeedItem(
  tweet: TwitterTweet,
  author: TwitterUser | undefined,
  includes: TwitterListResponse<TwitterTweet>["includes"]
): FeedItem {
  const text = compactText(tweet.text || "");
  const category = selectCategory(tweet.public_metrics);
  const engagement =
    (tweet.public_metrics?.like_count ?? 0) +
    (tweet.public_metrics?.retweet_count ?? 0) +
    (tweet.public_metrics?.reply_count ?? 0);
  const normalizedEngagement = Math.min(engagement / 200, 1);
  const reasonScore = Number((0.55 + normalizedEngagement * 0.4).toFixed(2));
  const importanceScore = Number((0.5 + normalizedEngagement * 0.45).toFixed(2));
  const urgencyScore = Number((0.45 + normalizedEngagement * 0.45).toFixed(2));
  const trustScore = Number((0.65 + normalizedEngagement * 0.25).toFixed(2));

  const authorName = author?.name ?? author?.username ?? "Twitter user";
  const username = author?.username ?? "unknown";
  const authorHandle = `@${username}`;
  const permalink = author?.username
    ? `https://x.com/${author.username}/status/${tweet.id}`
    : `https://x.com/i/web/status/${tweet.id}`;

  const media = normalizeMedia(includes?.media, tweet.attachments?.media_keys);
  const links = normalizeLinks(tweet.entities?.urls);

  return {
    id: `tw-${tweet.id}`,
    source: "twitter",
    category,
    title: `${authorHandle}: ${text.slice(0, 120)}`.trim(),
    summaryShort: text,
    reasonScore,
    reasonLabel: "Twitter timeline",
    importanceScore,
    trustScore,
    urgencyScore,
    skipImpact: urgencyScore >= 0.8 ? "high" : urgencyScore >= 0.6 ? "medium" : "low",
    sourceTrust: trustScore >= 0.8 ? "high" : trustScore >= 0.65 ? "medium" : "low",
    clusterId: `twitter-${tweet.author_id ?? tweet.id}`,
    publishedAt: tweet.created_at ?? new Date().toISOString(),
    url: permalink,
    tweetId: tweet.id,
    text,
    permalink,
    author: {
      id: author?.id ?? tweet.author_id ?? "unknown",
      name: authorName,
      username,
      avatarUrl: author?.profile_image_url,
      verified: author?.verified
    },
    media,
    links,
    metrics: {
      likeCount: tweet.public_metrics?.like_count ?? 0,
      repostCount: tweet.public_metrics?.retweet_count ?? 0,
      replyCount: tweet.public_metrics?.reply_count ?? 0,
      quoteCount: tweet.public_metrics?.quote_count ?? 0
    }
  };
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json"
      }
    });
  } catch (error) {
    throw new TwitterFeedError("TWITTER_FEED_UNAVAILABLE", 503, "Twitter API request failed", {
      cause: error instanceof Error ? error.message : "network_error"
    });
  }

  let raw: unknown;
  if ("text" in response && typeof response.text === "function") {
    const bodyText = await response.text();
    if (bodyText) {
      try {
        raw = JSON.parse(bodyText) as unknown;
      } catch {
        raw = undefined;
      }
    }
  } else if ("json" in response && typeof response.json === "function") {
    raw = await response.json().catch(() => undefined);
  }

  if (!response.ok) {
    const details = typeof raw === "object" && raw !== null ? (raw as TwitterApiErrorBody) : undefined;
    throw new TwitterFeedError(
      mapTwitterErrorCode(response.status),
      response.status,
      `Twitter API request failed (${response.status})`,
      {
        title: details?.title,
        detail: details?.detail,
        type: details?.type,
        errors: details?.errors
      }
    );
  }

  return raw as T;
}

async function fetchMe(accessToken: string): Promise<TwitterUser> {
  const response = await getJson<TwitterSingleResponse<TwitterUser>>(
    `${TWITTER_API_BASE}/2/users/me?user.fields=id,name,username,profile_image_url,verified`,
    accessToken
  );

  if (!response.data?.id) {
    throw new TwitterFeedError("TWITTER_FEED_UNAVAILABLE", 502, "Twitter /2/users/me did not return a user");
  }

  return response.data;
}

function buildEndpoint(basePath: string, mode: "digest" | "live", maxResults: number): URL {
  const endpoint = new URL(basePath);
  endpoint.searchParams.set("max_results", String(Math.max(5, Math.min(maxResults, 100))));
  endpoint.searchParams.set("tweet.fields", "created_at,public_metrics,author_id,attachments,entities");
  endpoint.searchParams.set("expansions", "author_id,attachments.media_keys");
  endpoint.searchParams.set("user.fields", "id,name,username,profile_image_url,verified");
  endpoint.searchParams.set("media.fields", "media_key,type,url,preview_image_url,width,height");
  if (mode === "digest") {
    endpoint.searchParams.set("exclude", "retweets,replies");
  }

  return endpoint;
}

async function fetchTimeline(
  userId: string,
  accessToken: string,
  mode: "digest" | "live",
  maxResults: number
): Promise<TwitterListResponse<TwitterTweet>> {
  const endpoint = buildEndpoint(`${TWITTER_API_BASE}/2/users/${userId}/timelines/reverse_chronological`, mode, maxResults);
  return getJson<TwitterListResponse<TwitterTweet>>(endpoint.toString(), accessToken);
}

async function fetchOwnTweets(
  userId: string,
  accessToken: string,
  mode: "digest" | "live",
  maxResults: number
): Promise<TwitterListResponse<TwitterTweet>> {
  const endpoint = buildEndpoint(`${TWITTER_API_BASE}/2/users/${userId}/tweets`, mode, maxResults);
  return getJson<TwitterListResponse<TwitterTweet>>(endpoint.toString(), accessToken);
}

function shouldFallbackToOwnTweets(error: unknown): boolean {
  return error instanceof TwitterFeedError && (error.statusCode === 403 || error.statusCode === 404);
}

async function fetchBestEffortTweets(
  userId: string,
  accessToken: string,
  mode: "digest" | "live",
  limit: number
): Promise<TwitterListResponse<TwitterTweet>> {
  try {
    return await fetchTimeline(userId, accessToken, mode, limit);
  } catch (error) {
    if (!shouldFallbackToOwnTweets(error)) {
      throw error;
    }

    return fetchOwnTweets(userId, accessToken, mode, limit);
  }
}

export async function fetchTwitterFeedItems(input: FetchTwitterFeedInput): Promise<FeedItem[]> {
  const me = await fetchMe(input.accessToken);
  const boundedLimit = Math.min(input.limit, 50);

  let response = await fetchBestEffortTweets(me.id, input.accessToken, input.mode, boundedLimit);

  const tweets = response.data ?? [];
  const users = response.includes?.users ?? [];
  const userById = new Map(users.map((user) => [user.id, user]));
  const mapped = tweets.map((tweet) => toFeedItem(tweet, userById.get(tweet.author_id ?? me.id) ?? me, response.includes));

  let filtered = input.category ? mapped.filter((item) => item.category === input.category) : mapped;
  if (input.mode === "digest" && filtered.length === 0) {
    response = await fetchBestEffortTweets(me.id, input.accessToken, "live", boundedLimit);
    const liveTweets = response.data ?? [];
    const liveUsers = response.includes?.users ?? [];
    const liveUserById = new Map(liveUsers.map((user) => [user.id, user]));
    const mappedLive = liveTweets.map((tweet) => toFeedItem(tweet, liveUserById.get(tweet.author_id ?? me.id) ?? me, response.includes));
    filtered = input.category ? mappedLive.filter((item) => item.category === input.category) : mappedLive;
  }

  return filtered.slice(0, input.limit);
}
