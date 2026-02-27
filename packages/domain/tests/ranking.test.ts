import { describe, expect, it } from "vitest";
import { rankFeedCandidates } from "../src/ranking";

describe("rankFeedCandidates", () => {
  it("applies scoring formula and tie-break order", () => {
    const items = rankFeedCandidates([
      {
        id: "a",
        source: "twitter",
        category: "following",
        title: "A",
        body: "A body",
        publishedAt: "2026-02-27T08:00:00.000Z",
        url: "https://x.com/a",
        clusterId: "c1",
        relevance: 0.8,
        freshness: 0.7,
        diversity: 0.6,
        trust: 0.8,
        urgency: 0.5,
        affinity: 0.9,
        semanticSimilarity: 0.4,
        trendVelocity: 0.3,
        repeatRisk: 0.3,
        criticalTopic: false,
        topicKey: "market",
        perspective: "primary"
      },
      {
        id: "b",
        source: "twitter",
        category: "following",
        title: "B",
        body: "B body",
        publishedAt: "2026-02-27T09:00:00.000Z",
        url: "https://x.com/b",
        clusterId: "c2",
        relevance: 0.8,
        freshness: 0.7,
        diversity: 0.6,
        trust: 0.8,
        urgency: 0.5,
        affinity: 0.9,
        semanticSimilarity: 0.4,
        trendVelocity: 0.3,
        repeatRisk: 0.4,
        criticalTopic: false,
        topicKey: "market",
        perspective: "primary"
      }
    ]);

    expect(items[0].id).toBe("b");
    expect(items[0].reasonLabel).toBe("Takip ettigin kaynak");
    expect(items[0].finalScore).toBeGreaterThan(0);
  });

  it("keeps counter-view reason on critical topics", () => {
    const items = rankFeedCandidates([
      {
        id: "critical-counter",
        source: "rss",
        category: "must_see",
        title: "Counter",
        body: "Counter body",
        publishedAt: "2026-02-27T09:00:00.000Z",
        url: "https://rss.example/counter",
        clusterId: "c3",
        relevance: 0.7,
        freshness: 0.7,
        diversity: 0.7,
        trust: 0.8,
        urgency: 0.8,
        affinity: 0.2,
        semanticSimilarity: 0.8,
        trendVelocity: 0.9,
        repeatRisk: 0.1,
        criticalTopic: true,
        topicKey: "security",
        perspective: "counter"
      }
    ]);

    expect(items[0].reasonLabel).toBe("Karsit gorus dengesi");
  });
});
