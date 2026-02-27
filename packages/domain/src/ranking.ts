import type { FeedCategory, FeedItem } from "@fokusfeed/shared-types";

export interface RankingCandidate {
  id: string;
  source: "twitter" | "rss";
  category: FeedCategory;
  title: string;
  body: string;
  publishedAt: string;
  url: string;
  clusterId: string;
  relevance: number;
  freshness: number;
  diversity: number;
  trust: number;
  urgency: number;
  affinity: number;
  semanticSimilarity: number;
  trendVelocity: number;
  repeatRisk: number;
  criticalTopic: boolean;
  topicKey: string;
  perspective: "primary" | "counter";
}

export interface RankedFeedItem extends FeedItem {
  baseScore: number;
  finalScore: number;
  repeatRisk: number;
  topicKey: string;
  perspective: "primary" | "counter";
}

const toFixed = (n: number): number => Number(n.toFixed(6));

export function buildReasonLabel(candidate: RankingCandidate): string {
  if (candidate.criticalTopic && candidate.perspective === "counter") {
    return "Karsit gorus dengesi";
  }

  if (candidate.category === "following" && candidate.affinity >= 0.75) {
    return "Takip ettigin kaynak";
  }

  if (candidate.semanticSimilarity >= 0.7) {
    return "Son donemde ilgilendigin konu";
  }

  if (candidate.trendVelocity >= 0.7 && candidate.urgency >= 0.6) {
    return "Piyasada hizli yukselen gelisme";
  }

  return "Secilen kalite sinyalleri";
}

export function toRankedItem(candidate: RankingCandidate): RankedFeedItem {
  const baseScore = toFixed(0.55 * candidate.relevance + 0.25 * candidate.freshness + 0.2 * candidate.diversity);
  const importanceScore = toFixed(candidate.relevance);
  const trustScore = toFixed(candidate.trust);
  const urgencyScore = toFixed(candidate.urgency);

  const finalScore = toFixed(
    0.6 * baseScore + 0.2 * trustScore + 0.1 * urgencyScore + 0.1 * importanceScore
  );

  return {
    id: candidate.id,
    source: candidate.source,
    category: candidate.category,
    title: candidate.title,
    summaryShort: candidate.body.slice(0, 180),
    reasonScore: finalScore,
    reasonLabel: buildReasonLabel(candidate),
    importanceScore,
    trustScore,
    urgencyScore,
    skipImpact: finalScore >= 0.8 ? "high" : finalScore >= 0.6 ? "medium" : "low",
    sourceTrust: trustScore >= 0.8 ? "high" : trustScore >= 0.6 ? "medium" : "low",
    clusterId: candidate.clusterId,
    publishedAt: candidate.publishedAt,
    url: candidate.url,
    baseScore,
    finalScore,
    repeatRisk: candidate.repeatRisk,
    topicKey: candidate.topicKey,
    perspective: candidate.perspective
  };
}

function sortRanked(items: RankedFeedItem[]): RankedFeedItem[] {
  return items.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }

    const publishedDiff = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (publishedDiff !== 0) {
      return publishedDiff;
    }

    if (b.trustScore !== a.trustScore) {
      return b.trustScore - a.trustScore;
    }

    return a.repeatRisk - b.repeatRisk;
  });
}

function enforceCounterViewQuota(items: RankedFeedItem[]): RankedFeedItem[] {
  const criticalBuckets = new Map<string, RankedFeedItem[]>();

  for (const item of items) {
    const categoryMatches = item.category === "must_see" || item.category === "trend_now";
    if (!categoryMatches) {
      continue;
    }

    if (!criticalBuckets.has(item.topicKey)) {
      criticalBuckets.set(item.topicKey, []);
    }

    criticalBuckets.get(item.topicKey)?.push(item);
  }

  for (const [, bucket] of criticalBuckets) {
    const hasCounter = bucket.some((item) => item.perspective === "counter");
    if (hasCounter) {
      continue;
    }

    const highest = bucket[0];
    if (!highest) {
      continue;
    }

    highest.reasonLabel = "Karsit gorus dengesi";
  }

  return items;
}

export function rankFeedCandidates(candidates: RankingCandidate[]): RankedFeedItem[] {
  const ranked = candidates.map(toRankedItem);
  const sorted = sortRanked(ranked);
  return enforceCounterViewQuota(sorted);
}
