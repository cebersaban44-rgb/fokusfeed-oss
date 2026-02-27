import type { RankingCandidate } from "@fokusfeed/domain";
import type { SavedItem } from "@fokusfeed/shared-types";

export const demoTenantId = "tenant-demo";
export const demoUserId = "user-demo";

export const demoCandidates: RankingCandidate[] = [
  {
    id: "feed-1",
    source: "twitter",
    category: "following",
    title: "Node.js 24 release deep dive",
    body: "Runtime improvements and ecosystem migration notes for maintainers.",
    publishedAt: "2026-02-27T07:00:00.000Z",
    url: "https://x.com/example/node24",
    clusterId: "cluster-1",
    relevance: 0.9,
    freshness: 0.85,
    diversity: 0.5,
    trust: 0.84,
    urgency: 0.62,
    affinity: 0.9,
    semanticSimilarity: 0.6,
    trendVelocity: 0.5,
    repeatRisk: 0.2,
    criticalTopic: false,
    topicKey: "runtime",
    perspective: "primary"
  },
  {
    id: "feed-2",
    source: "rss",
    category: "must_see",
    title: "Security advisory in OAuth app flows",
    body: "A new advisory impacts callback verification logic.",
    publishedAt: "2026-02-27T06:30:00.000Z",
    url: "https://rss.example/security-advisory",
    clusterId: "cluster-2",
    relevance: 0.88,
    freshness: 0.8,
    diversity: 0.6,
    trust: 0.9,
    urgency: 0.9,
    affinity: 0.4,
    semanticSimilarity: 0.7,
    trendVelocity: 0.8,
    repeatRisk: 0.1,
    criticalTopic: true,
    topicKey: "security",
    perspective: "primary"
  },
  {
    id: "feed-3",
    source: "rss",
    category: "trend_now",
    title: "Counter analysis for the same advisory",
    body: "Alternative interpretation and mitigation priorities from another source.",
    publishedAt: "2026-02-27T06:40:00.000Z",
    url: "https://rss.example/security-counter",
    clusterId: "cluster-3",
    relevance: 0.78,
    freshness: 0.82,
    diversity: 0.8,
    trust: 0.86,
    urgency: 0.83,
    affinity: 0.35,
    semanticSimilarity: 0.66,
    trendVelocity: 0.85,
    repeatRisk: 0.12,
    criticalTopic: true,
    topicKey: "security",
    perspective: "counter"
  },
  {
    id: "feed-4",
    source: "twitter",
    category: "similar_likes",
    title: "PostgreSQL 18 vector query benchmarks",
    body: "Benchmarks compare HNSW and IVFFlat in mixed workloads.",
    publishedAt: "2026-02-27T05:00:00.000Z",
    url: "https://x.com/example/pg18",
    clusterId: "cluster-4",
    relevance: 0.83,
    freshness: 0.72,
    diversity: 0.7,
    trust: 0.79,
    urgency: 0.45,
    affinity: 0.6,
    semanticSimilarity: 0.82,
    trendVelocity: 0.4,
    repeatRisk: 0.3,
    criticalTopic: false,
    topicKey: "database",
    perspective: "primary"
  }
];

export const demoSavedItems: SavedItem[] = [
  {
    id: "saved-1",
    userId: demoUserId,
    feedItemId: "feed-1",
    title: "Node.js 24 release deep dive",
    summaryShort: "Runtime improvements and ecosystem migration notes for maintainers.",
    topics: ["node", "runtime"],
    personalImportance: 0.86,
    revisitScore: 0.8,
    createdAt: "2026-02-27T08:00:00.000Z"
  }
];
