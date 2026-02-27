import { randomUUID } from "node:crypto";
import { deterministicAskAnswer, deterministicSummary, estimateTimeSavedMs, rankFeedCandidates } from "@fokusfeed/domain";
import type { CursorPage, FeedItem, SavedItem } from "@fokusfeed/shared-types";
import { demoCandidates, demoSavedItems, demoTenantId, demoUserId } from "@fokusfeed/test-utils";
import { decodeCursor, encodeCursor } from "../lib/cursor";

export interface SaveInput {
  itemId: string;
  title?: string;
  summaryShort?: string;
  topics?: string[];
}

export interface LlmKeyRecord {
  provider: string;
  keyCiphertext: string;
  fingerprint: string;
  createdAt: string;
  revokedAt?: string;
}

export interface SessionRecord {
  id: string;
  tenantId: string;
  userId: string;
  modeMinutes: 10 | 15;
  startedAt: string;
  endedAt?: string;
}

export class InMemoryStore {
  private rankedFeed = rankFeedCandidates(demoCandidates);
  private sources = [
    { id: "src-x", kind: "twitter", title: "Twitter/X Following", url: "https://x.com" },
    { id: "src-rss-1", kind: "rss", title: "Engineering Weekly", url: "https://rss.example/eng.xml" }
  ];

  private savedByUser = new Map<string, SavedItem[]>();
  private notesBySaved = new Map<string, { id: string; note: string; createdAt: string }[]>();
  private feedbackEvents: Array<{ userId: string; action: string; ts: string; itemId: string }> = [];
  private sessions = new Map<string, SessionRecord>();
  private timeSavedMetrics = new Map<string, number[]>();
  private llmKeys = new Map<string, LlmKeyRecord>();

  constructor() {
    this.savedByUser.set(this.userScope(demoTenantId, demoUserId), [...demoSavedItems]);
  }

  private userScope(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`;
  }

  listSources(): Array<{ id: string; kind: string; title: string; url: string }> {
    return [...this.sources];
  }

  addRssSource(url: string, title?: string): { id: string; kind: string; title: string; url: string } {
    const source = {
      id: `src-rss-${randomUUID()}`,
      kind: "rss",
      title: title ?? "Custom RSS Source",
      url
    };

    this.sources.push(source);
    return source;
  }

  listFeed(mode: "digest" | "live", category: string | undefined, cursor: string | undefined, limit: number): CursorPage<FeedItem> {
    const offset = decodeCursor(cursor);

    let items = this.rankedFeed;
    if (category) {
      items = items.filter((item) => item.category === category);
    }

    if (mode === "digest") {
      items = items.filter((item) => item.category !== "trend_now");
    }

    const page = items.slice(offset, offset + limit);
    const nextOffset = offset + page.length;

    return {
      items: page.map((item) => ({
        id: item.id,
        source: item.source,
        category: item.category,
        title: item.title,
        summaryShort: deterministicSummary(item.summaryShort),
        reasonScore: item.reasonScore,
        reasonLabel: item.reasonLabel,
        importanceScore: item.importanceScore,
        trustScore: item.trustScore,
        urgencyScore: item.urgencyScore,
        skipImpact: item.skipImpact,
        sourceTrust: item.sourceTrust,
        clusterId: item.clusterId,
        publishedAt: item.publishedAt,
        url: item.url
      })),
      ...(nextOffset < items.length ? { nextCursor: encodeCursor(nextOffset) } : {})
    };
  }

  getTodayDigest(): FeedItem[] {
    return this.listFeed("digest", undefined, undefined, 20).items;
  }

  addFeedback(userId: string, itemId: string, action: string, ts: string): void {
    this.feedbackEvents.push({ userId, itemId, action, ts });
  }

  saveItem(tenantId: string, userId: string, input: SaveInput): SavedItem {
    const scope = this.userScope(tenantId, userId);
    const list = this.savedByUser.get(scope) ?? [];
    const existing = list.find((item) => item.feedItemId === input.itemId);
    if (existing) {
      return existing;
    }

    const feedMatch = this.rankedFeed.find((item) => item.id === input.itemId);

    const saved: SavedItem = {
      id: `saved-${randomUUID()}`,
      userId,
      feedItemId: input.itemId,
      title: input.title ?? feedMatch?.title ?? "Saved item",
      summaryShort: input.summaryShort ?? deterministicSummary(feedMatch?.summaryShort ?? "No summary"),
      topics: input.topics ?? this.inferTopics(feedMatch?.title ?? "general"),
      personalImportance: Number((feedMatch?.importanceScore ?? 0.6).toFixed(2)),
      revisitScore: Number((feedMatch?.urgencyScore ?? 0.5).toFixed(2)),
      createdAt: new Date().toISOString()
    };

    list.unshift(saved);
    this.savedByUser.set(scope, list);
    return saved;
  }

  private inferTopics(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4)
      .slice(0, 3);
  }

  listSaved(
    tenantId: string,
    userId: string,
    query: string | undefined,
    cursor: string | undefined,
    limit: number
  ): CursorPage<SavedItem> {
    const scope = this.userScope(tenantId, userId);
    const offset = decodeCursor(cursor);
    const all = this.savedByUser.get(scope) ?? [];
    const filtered = query
      ? all.filter((item) => `${item.title} ${item.summaryShort}`.toLowerCase().includes(query.toLowerCase()))
      : all;

    const page = filtered.slice(offset, offset + limit);
    const nextOffset = offset + page.length;

    return {
      items: page,
      ...(nextOffset < filtered.length ? { nextCursor: encodeCursor(nextOffset) } : {})
    };
  }

  getSavedById(tenantId: string, userId: string, savedId: string): SavedItem | undefined {
    const scope = this.userScope(tenantId, userId);
    return (this.savedByUser.get(scope) ?? []).find((item) => item.id === savedId);
  }

  patchSaved(
    tenantId: string,
    userId: string,
    savedId: string,
    patch: Partial<Pick<SavedItem, "title" | "summaryShort">> & {
      personalImportance?: number;
      revisitScore?: number;
    }
  ): SavedItem | undefined {
    const scope = this.userScope(tenantId, userId);
    const list = this.savedByUser.get(scope) ?? [];
    const item = list.find((entry) => entry.id === savedId);
    if (!item) {
      return undefined;
    }

    if (patch.title !== undefined) item.title = patch.title;
    if (patch.summaryShort !== undefined) item.summaryShort = patch.summaryShort;
    if (patch.personalImportance !== undefined) item.personalImportance = patch.personalImportance;
    if (patch.revisitScore !== undefined) item.revisitScore = patch.revisitScore;

    return item;
  }

  addSavedNote(savedId: string, note: string): { id: string; note: string; createdAt: string } {
    const notes = this.notesBySaved.get(savedId) ?? [];
    const record = { id: `note-${randomUUID()}`, note, createdAt: new Date().toISOString() };
    notes.unshift(record);
    this.notesBySaved.set(savedId, notes);
    return record;
  }

  askSaved(tenantId: string, userId: string, query: string, topK: number): { answer: string; citations: SavedItem[] } {
    const list = this.savedByUser.get(this.userScope(tenantId, userId)) ?? [];
    const filtered = list
      .filter((item) => `${item.title} ${item.summaryShort}`.toLowerCase().includes(query.toLowerCase()))
      .slice(0, topK);

    return {
      answer: deterministicAskAnswer(query, filtered),
      citations: filtered
    };
  }

  generateWeeklyReview(tenantId: string, userId: string): { weekId: string; highlights: SavedItem[]; delta: string } {
    const list = this.savedByUser.get(this.userScope(tenantId, userId)) ?? [];
    return {
      weekId: this.currentWeekId(),
      highlights: list.slice(0, 5),
      delta: "Topik cesitliligi artis trendinde"
    };
  }

  private currentWeekId(): string {
    const now = new Date();
    const first = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const diffDays = Math.floor((now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.ceil((diffDays + first.getUTCDay() + 1) / 7);
    return `${now.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  setLlmKey(tenantId: string, userId: string, record: LlmKeyRecord): void {
    this.llmKeys.set(this.userScope(tenantId, userId), record);
  }

  getLlmKey(tenantId: string, userId: string): LlmKeyRecord | undefined {
    return this.llmKeys.get(this.userScope(tenantId, userId));
  }

  revokeLlmKey(tenantId: string, userId: string): boolean {
    const scope = this.userScope(tenantId, userId);
    const current = this.llmKeys.get(scope);
    if (!current) {
      return false;
    }

    this.llmKeys.set(scope, { ...current, revokedAt: new Date().toISOString() });
    return true;
  }

  getGenerationMode(tenantId: string, userId: string): "llm" | "deterministic" {
    const key = this.getLlmKey(tenantId, userId);
    if (key && !key.revokedAt) {
      return "llm";
    }

    return "deterministic";
  }

  getProfileInterests(tenantId: string, userId: string): Array<{ topic: string; score: number }> {
    const list = this.savedByUser.get(this.userScope(tenantId, userId)) ?? [];
    const scores = new Map<string, number>();

    for (const item of list) {
      for (const topic of item.topics) {
        scores.set(topic, (scores.get(topic) ?? 0) + item.personalImportance);
      }
    }

    return [...scores.entries()]
      .map(([topic, score]) => ({ topic, score: Number(score.toFixed(2)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  getSourceTrustGraph(): Array<{ source: string; trustScore: number }> {
    return [
      { source: "twitter", trustScore: 0.78 },
      { source: "rss", trustScore: 0.86 }
    ];
  }

  startSession(tenantId: string, userId: string, modeMinutes: 10 | 15): SessionRecord {
    const session: SessionRecord = {
      id: `session-${randomUUID()}`,
      tenantId,
      userId,
      modeMinutes,
      startedAt: new Date().toISOString()
    };

    this.sessions.set(session.id, session);
    return session;
  }

  endSession(sessionId: string): { session: SessionRecord; timeSavedMs: number } | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    if (!session.endedAt) {
      session.endedAt = new Date().toISOString();
    }

    const consumedCount = 12;
    const timeSavedMs = estimateTimeSavedMs(consumedCount);
    const scope = this.userScope(session.tenantId, session.userId);
    const list = this.timeSavedMetrics.get(scope) ?? [];
    list.push(timeSavedMs);
    this.timeSavedMetrics.set(scope, list);

    return { session, timeSavedMs };
  }

  getTimeSavedSummary(tenantId: string, userId: string): { weeklyMedianMinutes: number; sampleCount: number } {
    const list = (this.timeSavedMetrics.get(this.userScope(tenantId, userId)) ?? []).slice().sort((a, b) => a - b);

    if (list.length === 0) {
      return { weeklyMedianMinutes: 0, sampleCount: 0 };
    }

    const mid = Math.floor(list.length / 2);
    const median = list.length % 2 === 0 ? (list[mid - 1] + list[mid]) / 2 : list[mid];

    return {
      weeklyMedianMinutes: Number((median / 60000).toFixed(2)),
      sampleCount: list.length
    };
  }
}

export const store = new InMemoryStore();
