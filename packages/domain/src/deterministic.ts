import type { SavedItem } from "@fokusfeed/shared-types";

export function deterministicSummary(input: string): string {
  if (!input.trim()) {
    return "Kaynak ozeti mevcut degil.";
  }

  const cleaned = input.replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 220);
}

export function deterministicAskAnswer(query: string, citations: SavedItem[]): string {
  if (citations.length === 0) {
    return `"${query}" icin kayitli icerik bulunamadi.`;
  }

  const topTitles = citations.slice(0, 3).map((item) => item.title).join("; ");
  return `"${query}" sorgusu icin en ilgili kayitlar: ${topTitles}.`;
}
