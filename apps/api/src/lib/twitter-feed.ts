import type { FeedCategory, FeedItem } from "@fokusfeed/shared-types";

interface TwitterUser {
  id: string;
  name?: string;
  username?: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
  };
}

interface TwitterListResponse<T> {
  data?: T[];
  includes?: {
    users?: TwitterUser[];
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

const TWITTER_API_BASE = "https://api.x.com";

function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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

function toFeedItem(tweet: TwitterTweet, author: TwitterUser | undefined): FeedItem {
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
  const authorHandle = author?.username ? `@${author.username}` : authorName;
  const url = author?.username
    ? `https://x.com/${author.username}/status/${tweet.id}`
    : `https://x.com/i/web/status/${tweet.id}`;

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
    url
  };
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Twitter API request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchMe(accessToken: string): Promise<TwitterUser> {
  const response = await getJson<TwitterSingleResponse<TwitterUser>>(
    `${TWITTER_API_BASE}/2/users/me?user.fields=id,name,username`,
    accessToken
  );

  if (!response.data?.id) {
    throw new Error("Twitter /2/users/me did not return a user");
  }

  return response.data;
}

async function fetchTimeline(
  userId: string,
  accessToken: string,
  mode: "digest" | "live",
  maxResults: number
): Promise<TwitterListResponse<TwitterTweet>> {
  const fields = "created_at,public_metrics,author_id";
  const expansions = "author_id";
  const userFields = "id,name,username";
  const endpoint = new URL(`${TWITTER_API_BASE}/2/users/${userId}/timelines/reverse_chronological`);
  endpoint.searchParams.set("max_results", String(maxResults));
  endpoint.searchParams.set("tweet.fields", fields);
  endpoint.searchParams.set("expansions", expansions);
  endpoint.searchParams.set("user.fields", userFields);
  if (mode === "digest") {
    endpoint.searchParams.set("exclude", "retweets,replies");
  }

  return getJson<TwitterListResponse<TwitterTweet>>(endpoint.toString(), accessToken);
}

async function fetchOwnTweets(
  userId: string,
  accessToken: string,
  mode: "digest" | "live",
  maxResults: number
): Promise<TwitterListResponse<TwitterTweet>> {
  const endpoint = new URL(`${TWITTER_API_BASE}/2/users/${userId}/tweets`);
  endpoint.searchParams.set("max_results", String(maxResults));
  endpoint.searchParams.set("tweet.fields", "created_at,public_metrics,author_id");
  endpoint.searchParams.set("expansions", "author_id");
  endpoint.searchParams.set("user.fields", "id,name,username");
  if (mode === "digest") {
    endpoint.searchParams.set("exclude", "retweets,replies");
  }

  return getJson<TwitterListResponse<TwitterTweet>>(endpoint.toString(), accessToken);
}

function buildMockFeed(limit: number): FeedItem[] {
  const now = new Date().toISOString();
  const items: FeedItem[] = [
    {
      id: "tw-mock-1",
      source: "twitter",
      category: "following",
      title: "@mockuser: OAuth bağlantısı tamamlandı",
      summaryShort: "Twitter bağlantısı aktif. Gerçek veri yerine mock timeline gösteriliyor.",
      reasonScore: 0.72,
      reasonLabel: "Mock timeline",
      importanceScore: 0.7,
      trustScore: 0.82,
      urgencyScore: 0.54,
      skipImpact: "low",
      sourceTrust: "high",
      clusterId: "twitter-mock-1",
      publishedAt: now,
      url: "https://x.com/mockuser/status/1"
    },
    {
      id: "tw-mock-2",
      source: "twitter",
      category: "must_see",
      title: "@mockuser: İlk ingest adımı hazır",
      summaryShort: "Bu içerik, API okuması başarısızsa fallback olarak görünür.",
      reasonScore: 0.77,
      reasonLabel: "Mock timeline",
      importanceScore: 0.79,
      trustScore: 0.82,
      urgencyScore: 0.73,
      skipImpact: "medium",
      sourceTrust: "high",
      clusterId: "twitter-mock-2",
      publishedAt: now,
      url: "https://x.com/mockuser/status/2"
    }
  ];

  return items.slice(0, limit);
}

export async function fetchTwitterFeedItems(input: FetchTwitterFeedInput): Promise<FeedItem[]> {
  if (input.accessToken.startsWith("mock-access-")) {
    const mock = buildMockFeed(input.limit);
    return input.category ? mock.filter((item) => item.category === input.category) : mock;
  }

  const me = await fetchMe(input.accessToken);

  let response: TwitterListResponse<TwitterTweet>;
  try {
    response = await fetchTimeline(me.id, input.accessToken, input.mode, Math.min(input.limit, 20));
  } catch {
    response = await fetchOwnTweets(me.id, input.accessToken, input.mode, Math.min(input.limit, 20));
  }

  const tweets = response.data ?? [];
  const users = response.includes?.users ?? [];
  const userById = new Map(users.map((user) => [user.id, user]));
  const mapped = tweets.map((tweet) => toFeedItem(tweet, userById.get(tweet.author_id ?? me.id) ?? me));

  const filtered = input.category ? mapped.filter((item) => item.category === input.category) : mapped;
  return filtered.slice(0, input.limit);
}
