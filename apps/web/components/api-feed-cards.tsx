"use client";

import { useEffect, useState } from "react";

type FeedMode = "digest" | "live";

interface FeedItem {
  id: string;
  category: "following" | "similar_likes" | "must_see" | "trend_now";
  title: string;
  summaryShort: string;
  reasonLabel: string;
  reasonScore: number;
  publishedAt: string;
  url: string;
}

interface FeedResponse {
  data?: {
    items?: FeedItem[];
  };
  message?: string;
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant-demo";
const userId = process.env.NEXT_PUBLIC_USER_ID ?? "user-demo";

export function ApiFeedCards({ mode }: { mode: FeedMode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setError(payload.message ?? "Feed verisi alınamadı.");
        setItems([]);
        return;
      }

      setItems(payload.data?.items ?? []);
    } catch {
      setError("API bağlantı hatası.");
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
        <p>Feed yükleniyor...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <p style={{ color: "var(--warn)" }}>{error}</p>
        <button type="button" className="btn" onClick={load}>
          Tekrar Dene
        </button>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="panel">
        <p>Henüz gösterilecek Twitter verisi yok.</p>
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
          <span className="badge">Kaynak: Twitter API</span>
          <button type="button" className="btn" onClick={load}>
            Yenile
          </button>
        </div>
      </section>
      {items.map((item) => (
        <article key={item.id} className="panel">
          <span className="badge">{item.category}</span>
          <h3>{item.title}</h3>
          <p className="page-sub">{item.summaryShort}</p>
          <p className="footer-note">
            Reason: {item.reasonLabel} ({item.reasonScore})
          </p>
          <p className="footer-note">Published: {new Date(item.publishedAt).toLocaleString()}</p>
          <a className="btn" href={item.url} target="_blank" rel="noreferrer">
            Tweeti Aç
          </a>
        </article>
      ))}
    </div>
  );
}
