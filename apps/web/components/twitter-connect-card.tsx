"use client";

import { useEffect, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant-demo";
const userId = process.env.NEXT_PUBLIC_USER_ID ?? "user-demo";

interface TwitterStatusPayload {
  data?: {
    connected?: boolean;
    lastSyncAt?: string;
  };
}

interface TwitterStartPayload {
  data?: {
    authUrl?: string;
  };
  message?: string;
}

function authHeaders(idempotencyKey?: string): HeadersInit {
  return {
    "content-type": "application/json",
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {})
  };
}

export function TwitterConnectCard() {
  const [connected, setConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setCheckingStatus(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/v1/profile/twitter/status`, {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store"
      });

      if (!response.ok) {
        setConnected(false);
        setError("Twitter bağlantı durumu alınamadı.");
        return;
      }

      const payload = (await response.json()) as TwitterStatusPayload;
      setConnected(Boolean(payload.data?.connected));
    } catch {
      setConnected(false);
      setError("API'ye bağlanılamadı. API servisinin çalıştığını kontrol et.");
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    void checkStatus();
  }, []);

  const startOAuth = async () => {
    setConnecting(true);
    setError(null);

    try {
      const idempotencyKey = `twitter-start-${Date.now()}`;
      const response = await fetch(`${apiBase}/v1/auth/twitter/start`, {
        method: "POST",
        headers: authHeaders(idempotencyKey),
        body: JSON.stringify({})
      });

      const payload = (await response.json()) as TwitterStartPayload;
      if (!response.ok || !payload.data?.authUrl) {
        setError(payload.message ?? "Twitter OAuth başlatılamadı.");
        return;
      }

      window.location.assign(payload.data.authUrl);
    } catch {
      setError("Twitter bağlantısı başlatılamadı. Ağ bağlantısını kontrol et.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <section className="panel">
      <h3 style={{ marginTop: 0 }}>Twitter/X Bağlantısı Zorunlu</h3>
      <p className="page-sub">Twitter hesabı bağlanmadan feed ekranlarına erişim kapalıdır.</p>

      {checkingStatus ? <p>Bağlantı durumu kontrol ediliyor...</p> : null}
      {!checkingStatus && connected ? <p style={{ color: "var(--ok)" }}>Twitter hesabı bağlı.</p> : null}
      {!checkingStatus && !connected ? <p style={{ color: "var(--warn)" }}>Twitter hesabı henüz bağlı değil.</p> : null}
      {error ? <p style={{ color: "var(--warn)" }}>{error}</p> : null}

      <div className="controls">
        <button type="button" className="btn primary" onClick={startOAuth} disabled={checkingStatus || connecting}>
          {connecting ? "Yönlendiriliyor..." : "Twitter ile Bağlan"}
        </button>
        <button type="button" className="btn" onClick={checkStatus} disabled={connecting}>
          Durumu Yenile
        </button>
      </div>
    </section>
  );
}
