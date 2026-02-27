"use client";

import { useEffect, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant-demo";
const userId = process.env.NEXT_PUBLIC_USER_ID ?? "user-demo";

interface TwitterStatusPayload {
  data?: {
    connected?: boolean;
    connectedAt?: string;
    lastSyncAt?: string;
    lastErrorCode?: string;
    lastErrorAt?: string;
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
  const [statusMeta, setStatusMeta] = useState<{ lastSyncAt?: string; lastErrorCode?: string } | null>(null);
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
        setStatusMeta(null);
        setError("Twitter baglanti durumu alinamadi.");
        return;
      }

      const payload = (await response.json()) as TwitterStatusPayload;
      setConnected(Boolean(payload.data?.connected));
      setStatusMeta({
        lastSyncAt: payload.data?.lastSyncAt,
        lastErrorCode: payload.data?.lastErrorCode
      });
    } catch {
      setConnected(false);
      setStatusMeta(null);
      setError("API servisine baglanilamadi. API calistigini kontrol et.");
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
        setError(payload.message ?? "Twitter OAuth baslatilamadi.");
        return;
      }

      window.location.assign(payload.data.authUrl);
    } catch {
      setError("Twitter baglantisi baslatilamadi. Ag baglantini kontrol et.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <section className="panel">
      <h3 style={{ marginTop: 0 }}>Twitter/X Baglantisi Zorunlu</h3>
      <p className="page-sub">Twitter hesabi baglanmadan feed ekranlarina erisim kapali.</p>

      {checkingStatus ? <p>Baglanti durumu kontrol ediliyor...</p> : null}
      {!checkingStatus && connected ? <p style={{ color: "var(--ok)" }}>Twitter hesabi bagli.</p> : null}
      {!checkingStatus && !connected ? <p style={{ color: "var(--warn)" }}>Twitter hesabi henuz bagli degil.</p> : null}
      {statusMeta?.lastSyncAt ? <p className="footer-note">Son senkron: {new Date(statusMeta.lastSyncAt).toLocaleString()}</p> : null}
      {statusMeta?.lastErrorCode ? <p className="footer-note">Son hata: {statusMeta.lastErrorCode}</p> : null}
      {error ? <p style={{ color: "var(--warn)" }}>{error}</p> : null}

      <div className="controls">
        <button type="button" className="btn primary" onClick={startOAuth} disabled={checkingStatus || connecting}>
          {connecting ? "Yonlendiriliyor..." : "Twitter ile Baglan"}
        </button>
        <button type="button" className="btn" onClick={checkStatus} disabled={connecting}>
          Durumu Yenile
        </button>
      </div>
    </section>
  );
}
