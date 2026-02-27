"use client";

import { useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function AskSavedForm() {
  const [query, setQuery] = useState("node release");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { answer: string; mode?: string; latencyMs?: number }>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${apiBase}/v1/saved/ask`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant-demo",
          "x-user-id": "user-demo",
          "idempotency-key": `ask-${Date.now()}`
        },
        body: JSON.stringify({ query, topK: 20 })
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.message ?? "Request failed");
      } else {
        setResult({
          answer: json.data.answer,
          latencyMs: json.data.latencyMs,
          mode: json.meta?.generationMode
        });
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h3 style={{ marginTop: 0 }}>Ask Saved</h3>
      <p className="page-sub">Streaming is optional; this baseline renders final answer on completion.</p>
      <textarea className="textarea" value={query} onChange={(e) => setQuery(e.target.value)} rows={3} />
      <div className="controls" style={{ marginTop: 10 }}>
        <button type="button" className="btn primary" onClick={submit} disabled={loading}>
          {loading ? "Asking..." : "Ask"}
        </button>
      </div>
      {error ? <p style={{ color: "var(--warn)" }}>{error}</p> : null}
      {result ? (
        <div className="panel" style={{ marginTop: 10 }}>
          <p>{result.answer}</p>
          <p className="footer-note">
            generationMode: {result.mode ?? "deterministic"}, latency: {result.latencyMs ?? 0}ms
          </p>
        </div>
      ) : null}
    </section>
  );
}
