export type FeedCategory = "following" | "similar_likes" | "must_see" | "trend_now";

export type FeedbackAction =
  | "like"
  | "dislike"
  | "save"
  | "mute_topic"
  | "open"
  | "skip";

export type GenerationMode = "llm" | "deterministic";

export interface ApiSuccess<T> {
  ok: true;
  requestId: string;
  data: T;
  meta?: {
    generationMode?: GenerationMode;
  };
}

export interface ApiError {
  ok: false;
  requestId: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface TwitterFeedAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  verified?: boolean;
}

export interface TwitterFeedMedia {
  mediaKey: string;
  type: "photo" | "video" | "animated_gif" | "unknown";
  mediaUrl?: string;
  previewImageUrl?: string;
  width?: number;
  height?: number;
}

export interface TwitterFeedLink {
  url: string;
  expandedUrl?: string;
  displayUrl?: string;
}

export interface TwitterFeedMetrics {
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
}

export interface FeedItem {
  id: string;
  source: "twitter" | "rss";
  category: FeedCategory;
  title: string;
  summaryShort: string;
  reasonScore: number;
  reasonLabel: string;
  importanceScore: number;
  trustScore: number;
  urgencyScore: number;
  skipImpact: "high" | "medium" | "low";
  sourceTrust: "high" | "medium" | "low";
  clusterId: string;
  publishedAt: string;
  url: string;
  tweetId?: string;
  text?: string;
  author?: TwitterFeedAuthor;
  media?: TwitterFeedMedia[];
  links?: TwitterFeedLink[];
  metrics?: TwitterFeedMetrics;
  permalink?: string;
}

export interface SavedItem {
  id: string;
  userId: string;
  feedItemId: string;
  title: string;
  summaryShort: string;
  topics: string[];
  personalImportance: number;
  revisitScore: number;
  createdAt: string;
}
