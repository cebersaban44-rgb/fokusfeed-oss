"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FeedMode = "digest" | "live";

type FeedErrorCode =
  | "TWITTER_CONNECTION_REQUIRED"
  | "TWITTER_SCOPE_MISSING"
  | "TWITTER_RATE_LIMITED"
  | "TWITTER_TOKEN_EXPIRED"
  | "TWITTER_FEED_UNAVAILABLE"
  | string;

interface FeedAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  verified?: boolean;
}

interface FeedMedia {
  mediaKey: string;
  type: "photo" | "video" | "animated_gif" | "unknown";
  mediaUrl?: string;
  previewImageUrl?: string;
}

interface FeedLink {
  url: string;
  expandedUrl?: string;
  displayUrl?: string;
}

interface FeedMetrics {
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
}

interface FeedItem {
  id: string;
  category: "following" | "similar_likes" | "must_see" | "trend_now";
  title: string;
  summaryShort: string;
  publishedAt: string;
  url: string;
  text?: string;
  permalink?: string;
  author?: FeedAuthor;
  media?: FeedMedia[];
  links?: FeedLink[];
  metrics?: FeedMetrics;
}

interface FeedResponse {
  data?: {
    items?: FeedItem[];
  };
  message?: string;
  code?: FeedErrorCode;
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant-demo";
const userId = process.env.NEXT_PUBLIC_USER_ID ?? "user-demo";

function mapErrorMessage(code: FeedErrorCode | undefined, message: string | undefined): string {
  if (code === "TWITTER_CONNECTION_REQUIRED") {
    return "Twitter hesabi bagli degil. Once onboarding ekranindan Twitter bagla.";
  }

  if (code === "TWITTER_SCOPE_MISSING") {
    return "Twitter uygulama izinleri yetersiz. tweet.read ve users.read izinlerini kontrol et.";
  }

  if (code === "TWITTER_RATE_LIMITED") {
    return "Twitter API rate limit asildi. Biraz bekleyip tekrar dene.";
  }

  if (code === "TWITTER_TOKEN_EXPIRED") {
    return "Twitter oturumu suresi dolmus. Hesabi yeniden bagla.";
  }

  if (code === "TWITTER_FEED_UNAVAILABLE") {
    return "Twitter feed su an alinamiyor. API erisimi ve plan limitlerini kontrol et.";
  }

  return message ?? "Feed verisi alinamadi.";
}

function formatCount(value: number | undefined): string {
  const safe = value ?? 0;
  return Intl.NumberFormat("tr-TR", { notation: safe >= 1000 ? "compact" : "standard" }).format(safe);
}

function displayMediaUrl(item: FeedMedia): string | undefined {
  if (item.type === "photo") {
    return item.mediaUrl;
  }

  return item.previewImageUrl ?? item.mediaUrl;
}

export function ApiFeedCards({ mode }: { mode: FeedMode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code?: FeedErrorCode; message: string } | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/v1/feed?mode=${mode}&limit=20`, {
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": userId
        },
        cache: "no-store"
      });

      const payload = (await response.json()) as FeedResponse;
      if (!response.ok) {
        setError({
          code: payload.code,
          message: mapErrorMessage(payload.code, payload.message)
        });
        setItems([]);
        return;
      }

      setItems(payload.data?.items ?? []);
    } catch {
      setError({ message: "API baglanti hatasi." });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [mode]);

  if (loading) {
    return (
      <section className="panel">
        <p>Feed yukleniyor...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel error-panel" role="alert">
        <h3 style={{ marginTop: 0 }}>Feed su an acilamiyor</h3>
        <p>{error.message}</p>
        <div className="controls">
          <button type="button" className="btn" onClick={load}>
            Tekrar Dene
          </button>
          <Link href="/onboarding" className="btn primary">
            Twitter Bagla
          </Link>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="panel">
        <p>Bu hesap icin gosterilecek tweet bulunamadi.</p>
        <button type="button" className="btn" onClick={load}>
          Yenile
        </button>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="controls">
          <span className="badge">Kaynak: X API</span>
          <button type="button" className="btn" onClick={load}>
            Yenile
          </button>
        </div>
      </section>

      {items.map((item) => {
        const author = item.author;
        const text = item.text ?? item.summaryShort;
        const media = item.media ?? [];
        const links = item.links ?? [];
        const metrics = item.metrics;

        return (
          <article key={item.id} className="panel tweet-card">
            <header className="tweet-head">
              <div className="tweet-author">
                {author?.avatarUrl ? (
                  <img className="tweet-avatar" src={author.avatarUrl} alt={`${author.name} avatar`} loading="lazy" />
                ) : (
                  <div className="tweet-avatar tweet-avatar-fallback">{(author?.name ?? "X").charAt(0).toUpperCase()}</div>
                )}

                <div>
                  <div className="tweet-author-line">
                    <strong>{author?.name ?? "Twitter User"}</strong>
                    {author?.verified ? <span className="verified">Verified</span> : null}
                  </div>
                  <div className="tweet-meta">
                    <span>@{author?.username ?? "unknown"}</span>
                    <span>•</span>
                    <span>{new Date(item.publishedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <span className="badge">{item.category}</span>
            </header>

            <p className="tweet-text">{text}</p>

            {media.length > 0 ? (
              <div className="tweet-media-grid">
                {media.map((entry) => {
                  const url = displayMediaUrl(entry);
                  if (!url) {
                    return null;
                  }

                  return <img key={entry.mediaKey} src={url} alt="Tweet media" className="tweet-media" loading="lazy" />;
                })}
              </div>
            ) : null}

            {links.length > 0 ? (
              <div className="tweet-links">
                {links.map((entry, idx) => (
                  <a key={`${item.id}-link-${idx}`} href={entry.expandedUrl ?? entry.url} target="_blank" rel="noreferrer" className="tweet-link-card">
                    {entry.displayUrl ?? entry.expandedUrl ?? entry.url}
                  </a>
                ))}
              </div>
            ) : null}

            <footer className="tweet-footer">
              <div className="tweet-metrics">
                <span>Reply {formatCount(metrics?.replyCount)}</span>
                <span>Repost {formatCount(metrics?.repostCount)}</span>
                <span>Like {formatCount(metrics?.likeCount)}</span>
                <span>Quote {formatCount(metrics?.quoteCount)}</span>
              </div>

              <a className="btn" href={item.permalink ?? item.url} target="_blank" rel="noreferrer">
                X'te Ac
              </a>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
