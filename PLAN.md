# FOKUSFEED OSS v1.0 Master Implementation Plan

## 0. Belge Kimligi
1. `Document ID`: `fokusfeed-oss-v1-master-plan`
2. `Version`: `3.0.0`
3. `Last Updated`: `2026-02-27`
4. `Owner`: `Product + Engineering`
5. `Decision Status`: `Locked for v1.0`
6. `Change Policy`: Yeni kararlar sadece Decision Log ile eklenir; onceki kilitli kararlar sessizce degistirilemez.

## 1. Kisa Ozet
1. FokusFeed, kullanicinin Twitter/X timeline'a girmeden guncel ve ilgili icerikleri kisa surede tuketmesini saglayan kisisellestirilmis ozet + canli akis urunudur.
2. v1.0 hedefi, gunluk bilgi tuketimini `10 dk` ve `15 dk` oturum modlari ile kontrollu hale getirmektir.
3. Sistem `kod + AI ajan hibrit` modelinde calisir: feed hot-path deterministik kod, AI ajanlar cold-path iyilestirme katmanidir.
4. Bu plan karar-tamdir ve dogrudan implementasyona uygundur.

## 2. Kilidi Kapanan Kararlar
| Alan | Karar |
|---|---|
| Dagitim modeli | Tamamen OSS (GitHub) |
| Arayuz | Web PWA only |
| Mimari | Moduler monolith + worker |
| Veri kaynaklari | Twitter/X + RSS |
| LLM stratejisi | BYOK API-only |
| Anahtarsiz calisma | Deterministic fallback acik |
| Veri katmani | PostgreSQL + pgvector |
| Queue katmani | Redis + BullMQ |
| Oturum politikasi | `10 dk` ve `15 dk`, varsayilan `15 dk` |
| Silme SLA | Hard delete `<= 30 gun` |

## 3. Kapsam ve Kapsam Disi

### 3.1 v1.0 Kapsam
1. Twitter/X OAuth ve resmi API entegrasyonu.
2. RSS ingest pipeline.
3. Kategori bazli feed: `following`, `similar_likes`, `must_see`, `trend_now`.
4. Tuketim modeli: gunde 2 digest (`08:00`, `18:00`) + live tab.
5. Feedback aksiyonlari: `like`, `dislike`, `save`, `mute_topic`, `open`, `skip`.
6. Save & Recall: akilli kaydetme, semantik arama, haftalik derleme, revisit queue.
7. Dikkat yonetimi: sonsuz scroll kapali, oturum butcesi, session end ekrani.
8. Mock provider modu ve demo dataset ile anahtarsiz local acilis.
9. OSS repo standardi, CI/CD, ADR ve test fixture zorunlulugu.

### 3.2 v1.0 Kapsam Disi
1. Coklu sosyal aglar (Reddit, YouTube) entegrasyonu.
2. Kurumsal yonetim paneli.
3. Native mobil uygulama.
4. Uzun format otomatik makale uretimi.

## 4. Kullanici Akislari (Uctan Uca)

### 4.1 Onboarding
1. Kullanici hesap acar ve Twitter/X baglantisini tamamlar.
2. Sistem takip ve etkilesim sinyallerinden ilk ilgi profilini cikarir.
3. RSS kaynak seti otomatik atanir.
4. Ilk digest en gec `5 dakika` icinde uretilir.

### 4.2 Gunluk Kullanim
1. Kullanici digest ekraninda yuksek degerli kartlari gorur.
2. Kart aksiyonlari profile anlik geri besleme olarak islenir.
3. Kullanici live tab'e gectiginde gruplu taze icerik bloklari gorur.
4. Oturum bitiminde session end ekraninda zaman tasarrufu ozeti gosterilir.
5. Live feed yenileme periyodu sabit `10 dakika` olarak uygulanir.

### 4.3 Oturum Politikasi
1. Sistem yalnizca `10 dk` ve `15 dk` oturum modlarini destekler.
2. Varsayilan mod `15 dk` olarak acilir.
3. Oturum suresi doldugunda feed durdurulur ve session end ekrani zorunlu gosterilir.

### 4.4 Save ve Geri Donus
1. Save aksiyonu icerigi bilgi kasasina alir.
2. Sistem konu, guven ve onem alanlarini otomatik zenginlestirir.
3. Kullanici dogal dil ile gecmis kayitlarini sorgulayabilir.
4. Haftalik derleme kritik kayitlari ve degisimi listeler.

## 5. Fonksiyonel Gereksinimler (FR)

### 5.1 Feed ve Kisisellestirme
1. `FR-001`: Sistem her kullanici icin kisisel feed uretmelidir.
2. `FR-002`: Feed 4 kategoriye ayrilmalidir.
3. `FR-003`: Her kartta kisa ozet, reason bilgisi, guven/onem/aciliyet sinyalleri olmalidir.
4. `FR-004`: Feedback aksiyonlari sira modeline geri beslenmelidir.
5. `FR-005`: Tekrar icerikler cluster kartta birlestirilmelidir.
6. `FR-006`: Kritik konularda en az 1 karsit gorus icerigi gosterilmelidir.
7. `FR-007`: `skip_impact` etiketi uretilmelidir.

### 5.2 Save ve Recall
1. `FR-008`: Kullanici tek tikla icerik kaydedebilmelidir.
2. `FR-009`: Kaydedilen icerikler otomatik zenginlestirilmelidir.
3. `FR-010`: Dogal dilde semantik arama desteklenmelidir.
4. `FR-011`: Haftalik kayit derlemesi otomatik uretilmelidir.
5. `FR-012`: Kaydedilen icerikten not/gorev olusturma desteklenmelidir.
6. `FR-013`: Yeniden okuma kuyrugu uretilmelidir.

### 5.3 Dikkat ve Zaman Yonetimi
1. `FR-014`: Sonsuz scroll kapali olmalidir.
2. `FR-015`: `10 dk` ve `15 dk` zaman butcesi modlari desteklenmelidir.
3. `FR-016`: Session end ekraninda zaman tasarrufu metrigi verilmelidir.

### 5.4 Ranking ve Aciklanabilirlik
1. Amac: Kullaniciya en yuksek degerli icerigi gostermek ve her kart icin neden gosterdigini aciklayabilmektir.
2. Aday uretimi asamasi en az su kaynaklardan olusur: takip edilenler, semantik benzerlik, trend, RSS.
3. MVP skorlamasi alan eslesmesi:
4. `base_score = 0.55 relevance + 0.25 freshness + 0.20 diversity`.
5. `importance_score = relevance`.
6. `final_score = 0.60 base_score + 0.20 trust_score + 0.10 urgency_score + 0.10 importance_score`.
7. `reasonLabel` deterministik kurallarla uretilir:
8. `Takip ettigin kaynak` -> yuksek affinity ve following kategorisi.
9. `Son donemde ilgilendigin konu` -> semantik benzerlik skoru esik ustu.
10. `Piyasada hizli yukselen gelisme` -> trend ivmesi ve urgency esigi ustu.
11. `Karsit gorus dengesi` -> kritik konuda farkli perspektif kotasi tetiklendiyse.
12. En az bir karsit gorus karti, `must_see` ve `trend_now` icinde kritik konu basina zorunludur.
13. Esit skor durumunda tie-break sirasi: daha yeni icerik -> daha yuksek trust -> daha dusuk tekrar riski.

## 6. Non-Functional Gereksinimler (NFR)
1. `NFR-001`: `GET /v1/feed` p95 `< 500ms`.
2. `NFR-002`: `POST /v1/saved` p95 `< 150ms`.
3. `NFR-003`: `POST /v1/saved/ask` p95 `< 900ms` (`topK=20`).
4. `NFR-004`: Queue gecikmesi p95 `< 2 dakika`.
5. `NFR-005`: `100k` DAU seviyesinde sistem stabil calismalidir.
6. `NFR-006`: Kullanici basina gunluk `300-800` aday icerik islenebilmelidir.
7. `NFR-007`: API availability hedefi `>= 99.9%` olmalidir.
8. `NFR-008`: Tumu hassas tokenlar sifreli saklanmalidir.
9. `NFR-009`: Hesap silme talebi sonrasi hard delete `<= 30 gun` icinde tamamlanmalidir.
10. `NFR-010`: Live feed yenileme penceresi `10 dakika`yi asmamalidir.
11. `NFR-011`: Varsayilan rate limitler uygulanmalidir: `GET /v1/feed` `120 req/min/user`, yazma endpointleri `60 req/min/user`, `POST /v1/saved/ask` `10 req/min/user`.
12. `NFR-012`: API p95 hedefleri pik saatlerde de saglanmalidir (gunluk pik trafik x1.5).
13. `NFR-013`: BYOK provider timeout suresi `8s`, toplam tekrar deneme sayisi en fazla `1` olmalidir.
14. `NFR-014`: Queue tuketim kapasitesi pikte en az `2x` backlog eritme hizini korumalidir.
15. `NFR-015`: Audit ve operasyonel retention politikalari uygulanabilir ve testlenebilir olmalidir.

## 7. Teknoloji Seti ve Uyum Matrisi

### 7.1 Kilit Teknolojiler
1. Runtime policy: onerilen hedef `Node.js 24 Active LTS`, minimum uyumluluk `20.9`.
2. Frontend: `Next.js App Router + TypeScript + PWA`.
3. API: `Fastify v5 + TypeScript`.
4. Jobs: `BullMQ + Redis 7+`.
5. Database: `PostgreSQL 17/18 + pgvector`.
6. Observability: `OpenTelemetry + Prometheus + Grafana`.
7. CI: `GitHub Actions`.
8. Local infra: `Docker Compose`.

### 7.2 Uyum Matrisi
| Bilesen | Gereksinim | Uyum Gerekcesi |
|---|---|---|
| Node.js | 24 LTS | Next.js ve Fastify v5 gereksinimleri ile uyumlu |
| Next.js | App Router | PWA web dagitimina uygun, TypeScript ile dogal uyum |
| Fastify v5 | Node 20+ | Yuke dayanikli REST API ve plugin ekosistemi |
| Redis 7+ | BullMQ backend | Retry, schedule, queue durability icin standart |
| PostgreSQL 17/18 | pgvector extension | Relational + vector query ayni depoda |
| pgvector | PostgreSQL extension | Semantik recall icin SQL icinde benzerlik aramasi |

### 7.3 Kapasite Baseline (Planlama Varsayimi)
1. Trafik varsayimi: `100k` DAU, kullanici basi gunluk ortalama `2` oturum.
2. Oturum varsayimi: oturum basi ortalama `25` kart goruntuleme, `8` etkilesim.
3. Pik esitlik varsayimi: gunluk pik saatte ortalama trafigin `x1.5` katsayisi.
4. API kapasite hedefi: feed ve saved endpointleri pikte de NFR p95 hedeflerini korur.
5. Worker kapasite hedefi: ingest + feature + ranking kuyruklari icin `>=2x` burst absorb kapasitesi.

## 8. Mimari ve Bilesenler

### 8.1 Monorepo Yapisi
1. `apps/web`
2. `apps/api`
3. `apps/worker`
4. `packages/domain`
5. `packages/shared-types`
6. `packages/config`
7. `packages/test-utils`
8. `docs`
9. `infra`

### 8.2 Moduler Monolith Domainleri
1. `auth-domain`
2. `source-domain`
3. `feed-domain`
4. `ranking-domain`
5. `saved-domain`
6. `session-domain`
7. `policy-domain`
8. `trust-domain`
9. `metrics-domain`

### 8.3 Servis Akisi
1. Ingest servisleri ham icerigi ceker ve normalize eder.
2. Dedupe katmani benzer olaylari clusterlar.
3. Feature builder embedding ve quality feature'larini uretir.
4. Ranking servisi adaylari skorlayip kategoriye yerlestirir.
5. Digest generator sabah/aksam kart seti olusturur.
6. Feedback learner kullanici aksiyonlarini profile geri besler.
7. Saved servisi recall indeksini gunceller.
8. Policy engine oturum kurallarini uygular.

## 9. Veri Mimarisi (Neyi Nereye Sakliyoruz)
| Veri Turu | Depolama | Not |
|---|---|---|
| Kullanici/profil/feed metadata | PostgreSQL | ACID, iliskisel sorgu |
| Embedding vektorleri | PostgreSQL + pgvector | Semantik arama |
| Queue state ve job locklari | Redis | BullMQ runtime verisi |
| OAuth tokenlari | PostgreSQL (application-level encryption) | Anahtarlar env/KMS tarafinda |
| BYOK LLM API key materyali | PostgreSQL (application-level encryption) | Sadece server tarafinda cozulur, loglanmaz |
| Tenant ve uyelik metadata | PostgreSQL | Mantiksal tenant izolasyonu icin zorunlu |
| Audit log kayitlari | PostgreSQL + log pipeline | Hukuki ve operasyonel izlenebilirlik |
| Deletion workflow durumu | PostgreSQL `deletion_requests` | SLA takibi |

## 10. Veri Modeli (Ozet Sema)

### 10.1 Core Tablolar
1. `users`
2. `auth_accounts`
3. `oauth_tokens_encrypted`
4. `sources`
5. `content_items`
6. `content_clusters`
7. `content_features`
8. `user_profiles`
9. `user_interest_vectors`
10. `feed_candidates`
11. `feed_rankings`
12. `feed_delivery_log`
13. `feedback_events`
14. `saved_items`
15. `saved_item_embeddings`
16. `saved_collections`
17. `saved_notes`
18. `weekly_saved_reviews`
19. `sessions`
20. `time_saved_metrics`
21. `feature_flags`
22. `experiments`
23. `source_trust_history`
24. `deletion_requests`
25. `audit_logs`
26. `tenants`
27. `tenant_memberships`
28. `user_llm_api_keys_encrypted`

### 10.2 Kritik Alanlar
1. `content_items`: `source`, `author_id`, `published_at`, `lang`, `url_hash`.
2. `content_features`: `embedding`, `topic_tags`, `sentiment`, `spam_score`.
3. `feed_rankings`: `base_score`, `importance_score`, `trust_score`, `urgency_score`, `final_score`.
4. `feedback_events`: `action`, `ts`, `context_mode`, `context_category`.
5. `saved_items`: `personal_importance`, `revisit_score`, `archived_at`.
6. Tenant-scope tablolarinda zorunlu alan: `tenant_id`.
7. `user_llm_api_keys_encrypted`: `tenant_id`, `user_id`, `provider`, `key_ciphertext`, `key_fingerprint`, `created_at`, `revoked_at`.

### 10.3 Multi-Tenant ve Izolasyon Modeli
1. v1.0 modeli mantiksal multi-tenant'tir; tum user-scope kayitlari `tenant_id` ile etiketlenir.
2. Uygulama katmaninda her sorgu `tenant_id` filtresi olmadan calistirilamaz.
3. Kritik tablolarda benzersizlikler `tenant_id` ile birlikte tanimlanir.
4. Isolation testi 16.4 icinde zorunludur.

### 10.4 Index, Constraint, Migration ve Backfill
1. Zorunlu unique indexler:
2. `content_items (tenant_id, url_hash)` unique.
3. `saved_items (tenant_id, user_id, feed_item_id)` unique.
4. `feedback_events (tenant_id, user_id, item_id, action, ts)` composite index.
5. `feed_rankings (tenant_id, user_id, final_score desc, published_at desc)` index.
6. `sessions (tenant_id, user_id, started_at desc)` index.
7. pgvector indexi: `saved_item_embeddings.embedding` icin cosine/HNSW index.
8. Migration kurali: tum schema degisiklikleri ileri uyumlu, geri alma scripti ile gelir.
9. Backfill kurali: eski kayitlarda `tenant_id` yoksa varsayilan tenant'e deterministic map ile atanir.

## 11. API Kontratlari (Public Interfaces)

### 11.1 Global Standartlar
1. Tum endpoint'ler `/v1` altindadir.
2. Yazma endpoint'lerinde `Idempotency-Key` zorunludur.
3. Tum response'lar `requestId` alanini icerir.
4. Pagination `cursor` tabanlidir: varsayilan `limit=20`, maksimum `limit=50`.
5. Error formati tum endpoint'lerde tek tiptir.
6. Varsayilan rate limitler: `GET /v1/feed` `120 req/min/user`, yazma endpointleri `60 req/min/user`, `POST /v1/saved/ask` `10 req/min/user`.
7. API timeout butcesi: upstream haric internal endpointlerde max `10s`.
8. `v1` minor degisikliklerinde geriye uyumluluk korunur; breaking degisiklik yeni major path ile cikar.
9. Tenant cozumleme kurali: kimlik dogrulamasi sonrasi `tenant_id` claim/context'ten okunur; yoksa request reddedilir.

### 11.2 Kimlik ve Kaynak
1. `POST /v1/auth/twitter/start` (`Idempotency-Key`)
2. `GET /v1/auth/twitter/callback`
3. `GET /v1/sources`
4. `POST /v1/sources/rss` (`Idempotency-Key`)

### 11.3 Feed
1. `GET /v1/feed?mode=digest|live&category=&cursor=&limit=`
2. `GET /v1/digest/today`
3. `POST /v1/feedback` (`Idempotency-Key`)

### 11.4 Save ve Recall
1. `POST /v1/saved` (`Idempotency-Key`)
2. `GET /v1/saved?query=&topic=&source=&from=&to=&cursor=&limit=`
3. `GET /v1/saved/:id`
4. `PATCH /v1/saved/:id` (`Idempotency-Key`)
5. `POST /v1/saved/:id/note` (`Idempotency-Key`)
6. `POST /v1/saved/ask` (`Idempotency-Key`)
7. `GET /v1/saved/review/weekly`
8. `POST /v1/saved/:id/remind` (`Idempotency-Key`)

### 11.5 Profil ve Metrik
1. `GET /v1/profile/interests`
2. `GET /v1/profile/source-trust-graph`
3. `POST /v1/session/start` (`Idempotency-Key`)
4. `POST /v1/session/end` (`Idempotency-Key`)
5. `GET /v1/metrics/time-saved`
6. `GET /v1/profile/llm-key/status`
7. `POST /v1/profile/llm-key` (`Idempotency-Key`)
8. `DELETE /v1/profile/llm-key` (`Idempotency-Key`)

### 11.6 Endpoint Sozlesme Ornekleri
1. `GET /v1/feed`
2. Request: `mode` zorunlu (`digest|live`), `limit` (`1..50`), `cursor` opsiyonel.
3. Response `200`: `ApiSuccess<CursorPage<FeedItem>>`.
4. Error `400`: `VALIDATION_ERROR`, Error `401`: `AUTH_UNAUTHORIZED`.
5. Validation: `mode` gecersizse istek reddedilir, `limit>50` normalize edilmez direkt hata donulur.
6. `POST /v1/feedback`
7. Request body: `{ itemId: string, action: FeedbackAction, contextMode: "digest"|"live", ts: ISO8601 }`.
8. Header: `Idempotency-Key` zorunlu.
9. Response `202`: `ApiSuccess<{ accepted: true }>` (async processing).
10. Error `409`: `CONFLICT_IDEMPOTENCY`.
11. `POST /v1/saved/ask`
12. Request body: `{ query: string, topK?: number, filters?: { source?: string, from?: string, to?: string } }`.
13. Validation: `query` min `3` karakter, `topK` varsayilan `20`, maksimum `50`.
14. Response `200`: `ApiSuccess<{ answer: string, citations: SavedItem[], latencyMs: number }>` .
15. Error `422`: `VALIDATION_ERROR`, Error `503`: `UPSTREAM_PROVIDER_ERROR` (BYOK provider gecici hata).
16. `POST /v1/profile/llm-key`
17. Request body: `{ provider: string, apiKey: string }`.
18. Validation: `provider` allow-list disinda ise reddedilir; anahtar minimum uzunluk kurali zorunludur.
19. Response `201`: `ApiSuccess<{ stored: true, provider: string, fingerprint: string }>` .
20. Error `400`: `VALIDATION_ERROR`, Error `401`: `AUTH_UNAUTHORIZED`.

### 11.7 Standart Hata Kodlari
1. `AUTH_UNAUTHORIZED`
2. `AUTH_FORBIDDEN`
3. `VALIDATION_ERROR`
4. `NOT_FOUND`
5. `RATE_LIMITED`
6. `CONFLICT_IDEMPOTENCY`
7. `UPSTREAM_PROVIDER_ERROR`
8. `INTERNAL_ERROR`

### 11.8 Tipler
```ts
type FeedCategory = "following" | "similar_likes" | "must_see" | "trend_now";
type FeedbackAction = "like" | "dislike" | "save" | "mute_topic" | "open" | "skip";
type GenerationMode = "llm" | "deterministic";

interface ApiSuccess<T> {
  ok: true;
  requestId: string;
  data: T;
  meta?: {
    generationMode?: GenerationMode;
  };
}

interface ApiError {
  ok: false;
  requestId: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

interface FeedItem {
  id: string;
  source: "twitter" | "rss";
  category: FeedCategory;
  title: string;
  summaryShort: string;
  reasonScore: number;
  reasonLabel: string;
  importanceScore: number;
  trustScore: number;
  urgencyScore: number;
  skipImpact: "high" | "medium" | "low";
  sourceTrust: "high" | "medium" | "low";
  clusterId: string;
  publishedAt: string;
  url: string;
}

interface SavedItem {
  id: string;
  userId: string;
  feedItemId: string;
  title: string;
  summaryShort: string;
  topics: string[];
  personalImportance: number;
  revisitScore: number;
  createdAt: string;
}
```

### 11.9 Tum Endpointler Icin Durum Matrisi
| Endpoint | Basarili Kod | Beklenen Hata Kodlari |
|---|---|---|
| `POST /v1/auth/twitter/start` | `200` | `401`, `409`, `500` |
| `GET /v1/auth/twitter/callback` | `302` | `400`, `401`, `500` |
| `GET /v1/sources` | `200` | `401`, `429` |
| `POST /v1/sources/rss` | `201` | `400`, `401`, `409`, `429` |
| `GET /v1/feed` | `200` | `400`, `401`, `429` |
| `GET /v1/digest/today` | `200` | `401`, `404`, `429` |
| `POST /v1/feedback` | `202` | `400`, `401`, `409`, `429` |
| `POST /v1/saved` | `201` | `400`, `401`, `409`, `429` |
| `GET /v1/saved` | `200` | `400`, `401`, `429` |
| `GET /v1/saved/:id` | `200` | `401`, `404`, `429` |
| `PATCH /v1/saved/:id` | `200` | `400`, `401`, `404`, `409`, `429` |
| `POST /v1/saved/:id/note` | `201` | `400`, `401`, `404`, `409`, `429` |
| `POST /v1/saved/ask` | `200` | `400`, `401`, `422`, `429`, `503` |
| `GET /v1/saved/review/weekly` | `200` | `401`, `404`, `429` |
| `POST /v1/saved/:id/remind` | `202` | `400`, `401`, `404`, `409`, `429` |
| `GET /v1/profile/interests` | `200` | `401`, `429` |
| `GET /v1/profile/source-trust-graph` | `200` | `401`, `429` |
| `POST /v1/session/start` | `201` | `400`, `401`, `409`, `429` |
| `POST /v1/session/end` | `200` | `400`, `401`, `404`, `409`, `429` |
| `GET /v1/metrics/time-saved` | `200` | `401`, `429` |
| `GET /v1/profile/llm-key/status` | `200` | `401`, `429` |
| `POST /v1/profile/llm-key` | `201` | `400`, `401`, `409`, `429` |
| `DELETE /v1/profile/llm-key` | `204` | `401`, `404`, `409`, `429` |

## 12. Event ve Queue Kontratlari

### 12.1 Event Envelope (Zorunlu)
```json
{
  "event_id": "uuid",
  "event_type": "content.ingested",
  "event_version": "v1",
  "occurred_at": "ISO-8601",
  "producer": "service-name",
  "partition_key": "user_or_content_key",
  "dedupe_key": "dedupe-token",
  "payload": {}
}
```

### 12.2 Queue Politikasi
1. Retry politikasi: `3` deneme, exponential backoff (`30s`, `2m`, `10m`).
2. Basarisiz isler `DLQ` kuyruguna tasinir.
3. Ayni `partition_key` icin sira korunur.
4. `dedupe_key` ile idempotent tuketim zorunludur.
5. Event tuketicileri `event_version` icin `vN` ve `vN-1` uyumlulugu saglar.

### 12.3 Event Listesi
1. `content.ingested`
2. `content.clustered`
3. `content.features.built`
4. `ranking.completed`
5. `digest.generated`
6. `user.signal.updated`
7. `saved.created`
8. `saved.enriched`
9. `saved.review.generated`
10. `policy.session.completed`
11. `trust.updated`
12. `agent.profile.refined`

### 12.4 Event Isletim Tablosu
| Event | Producer | Consumer | Minimum Payload | Idempotency Anahtari |
|---|---|---|---|---|
| `content.ingested` | ingest worker | normalizer worker | `content_id`, `source`, `published_at` | `content_id` |
| `content.clustered` | dedupe worker | feature worker | `cluster_id`, `content_ids[]` | `cluster_id` |
| `content.features.built` | feature worker | ranking service | `content_id`, `embedding_ref`, `topic_tags[]` | `content_id` |
| `ranking.completed` | ranking service | digest/live delivery | `user_id`, `mode`, `items[]` | `user_id+mode+window` |
| `digest.generated` | digest service | notification worker | `user_id`, `digest_window`, `item_count` | `user_id+digest_window` |
| `user.signal.updated` | feedback api/worker | profile refiner | `user_id`, `action`, `item_id`, `ts` | `user_id+item_id+action+ts` |
| `saved.created` | saved service | enrichment worker | `saved_id`, `user_id`, `item_id` | `saved_id` |
| `saved.enriched` | enrichment worker | recall indexer | `saved_id`, `topics[]`, `embedding_ref` | `saved_id` |
| `saved.review.generated` | review worker | web api | `user_id`, `week_id`, `highlights[]` | `user_id+week_id` |
| `policy.session.completed` | policy engine | metrics service | `user_id`, `session_id`, `time_saved_ms` | `session_id` |
| `trust.updated` | trust engine | ranking service | `source_id`, `trust_score`, `updated_at` | `source_id+updated_at` |
| `agent.profile.refined` | agent runner | profile store | `user_id`, `profile_version`, `changes[]` | `user_id+profile_version` |
1. Tum eventler 12.1 envelope formatini kullanir.
2. Tum eventler 12.2 retry ve `DLQ` politikasina tabidir.

### 12.5 Event Semasi ve Versiyonlama Kurali
1. Her event turu icin JSON schema tutulur ve CI'da producer/consumer tarafinda dogrulanir.
2. `event_version` artisi sadece payload degisikligi oldugunda yapilir.
3. Zorunlu uyumluluk: producer `vN` yayinladiginda consumer `vN` ve `vN-1` tuketebilmelidir.
4. `vN-2` destekten cikisi release note ile en az bir minor once duyurulur.
5. Schema drift tespitinde event `DLQ`ya alinir ve otomatik replay sadece uyumlu surumde acilir.
6. Event schema dosya lokasyonu: `packages/shared-types/events/<event_type>.vN.schema.json`.

## 13. UI/UX Bilgi Mimarisi
1. `Onboarding`
2. `Today Digest`
3. `Live Feed`
4. `Saved Library`
5. `Ask Saved`
6. `Weekly Review`
7. `Profile & Source Trust`
8. `Session End / Time Saved`
9. `Settings`

### 13.1 UI Davranis Standartlari
1. Tum ekranlarda `loading`, `empty`, `error`, `retry` durumlari zorunludur.
2. Feed kartlarinda optimistic UI sadece local aksiyonlar (`save`, `like`) icin kullanilir.
3. `saved/ask` ekrani streaming zorunlu degildir; ilk cevap tamamlandiginda render edilir.
4. Erisilebilirlik: klavye navigasyonu, fokus halkasi ve minimum kontrast zorunludur.
5. Mobil ve desktop breakpoint'lerinde ayni bilgi mimarisi korunur, yalnizca layout degisir.
6. Route standartlari: `/onboarding`, `/digest`, `/live`, `/saved`, `/saved/ask`, `/review/weekly`, `/profile`, `/session/end`, `/settings`.

## 14. LLM Stratejisi
1. v1.0 varsayilani: `BYOK API-only`.
2. Local LLM zorunlu degildir.
3. Kullanici API anahtari baglamazsa deterministic fallback acik kalir.
4. LLM provider detayi internal config katmaninda tutulur.
5. Public API response'larinda provider/faturalama bilgisi tasinmaz.

### 14.1 LLM Acik/Kapali Davranis Matrisi
| Ozellik | BYOK Anahtar Var | BYOK Anahtar Yok (Deterministic Fallback) |
|---|---|---|
| Kart ozeti | LLM ile kisa ozet + reason metni | Template tabanli ozet + kural tabanli reason |
| `saved/ask` | Semantik cevabi metin + cite listesi | Keyword/metadata tabanli arama sonucu listesi |
| Topic tagging | LLM destekli konu normalizasyonu | Kural tabanli etiketleme (sozluk + regex) |
| Profile refine | Haftalik LLM rafine islemi | Sadece feedback istatistikleri ile guncelleme |
1. Fallback modunda sistem kapanmaz; sadece kalite seviyesi duser.
2. Fallback modunda API davranisi sabit kalir, yalnizca icerik uretim yontemi degisir.
3. Fallback modu aktifken response `meta.generationMode = "deterministic"` degeri ile doner.

### 14.2 BYOK Anahtar Yasam Dongusu
1. Anahtar kaydi: `POST /v1/profile/llm-key` ile sifreli saklanir.
2. Anahtar goruntuleme: plaintext anahtar hicbir endpoint'te geri donmez.
3. Anahtar rotasyonu: yeni anahtar yazildiginda eski anahtar `revoked_at` ile pasiflenir.
4. Anahtar silme: `DELETE /v1/profile/llm-key` ile aninda pasiflenir.
5. Anahtar kullanimi: sadece server-side provider adaptorunde cozulur; log ve telemetry'e yazilmaz.
6. Provider hatalarinda bir kez retry yapilir, sonra deterministic fallback devreye girer.

## 15. Guvenlik, Gizlilik, Hukuki
1. OAuth tokenlar application-level encryption ile saklanir.
2. Veri minimizasyonu ve amac sinirlama zorunludur.
3. Veri silme endpoint'i ve workflow'u zorunludur.
4. Tum kritik erisimler `audit_logs` tablosuna yazilir.
5. Rate limit ve abuse protection zorunludur.
6. Platform kullanim kosullari ve telif gereklilikleri dogrulanir.
7. AI ciktilarina PII filtresi uygulanir.
8. Deletion workflow: soft delete hemen, hard delete `<= 30 gun`.
9. Retention politikasi:
10. `audit_logs` en az `365 gun` saklanir.
11. `feedback_events` ve `sessions` verileri en az `180 gun` saklanir.
12. `feed_delivery_log` en az `90 gun` saklanir.
13. Retention suresi dolan kayitlar otomatik job ile anonymize veya purge edilir.
14. Kullanici silme talebinde, `audit_logs` icindeki dogrudan `user_id` baglantisi en gec `30 gun` icinde pseudonymize edilir.

## 16. Test Plani (Detayli)

### 16.1 Fonksiyonel
1. OAuth sonrasi ilk feed `<= 5 dakika`.
2. Kartlarda zorunlu alanlar tam gelmelidir.
3. Dislike sonrasi benzer icerik gorunurlugu dusmelidir.
4. Save sonrasi recall aramasinda icerik bulunmalidir.
5. Oturum modlari yalnizca `10 dk` ve `15 dk` olmalidir.

### 16.2 Performans
1. `100k` DAU load testi.
2. Kullanici basina `800` aday senaryosu.
3. Queue lag ve worker tuketim hizi dogrulamasi.
4. `GET /v1/feed` p95 `< 500ms`.
5. `POST /v1/saved/ask` p95 `< 900ms`.
6. Live refresh dongusu `10 dakika` ustune cikmamalidir.
7. Rate limit testleri endpoint bazinda dogrulanmalidir.

### 16.3 Kalite ve Relevans
1. Offline relevance seti ile NDCG/precision olcumu.
2. Diversity testi.
3. Repeat suppression testi.
4. Counter-view coverage testi.

### 16.4 Guvenlik
1. Auth bypass testleri.
2. Token encryption/decryption testleri.
3. Data deletion e2e testi.
4. Multi-tenant isolation testleri.
5. Idempotency catisma testleri.
6. BYOK key rotasyon ve revoke testleri.
7. API key plaintext log sizintisi testi.

### 16.5 E2E
1. Onboarding -> digest/live -> feedback -> save -> ask -> session-end akisi.
2. API anahtari yokken deterministic fallback ile akisin bozulmamasi.
3. API anahtari eklendikten sonra `meta.generationMode = "llm"` beklenmelidir.
4. API anahtari silindikten sonra `meta.generationMode = "deterministic"` beklenmelidir.

### 16.6 KPI Esikleri
1. Weekly time saved median `>= 35 dakika`.
2. Digest completion `>= %60`.
3. Saved recall basari orani `>= %85`.
4. Twitter'a geri donus oraninda `>= %20` dusus.

### 16.7 Operasyonel ve Sema Testleri
1. Event schema uyumluluk testi: `vN` ve `vN-1` consumer testleri.
2. Migration testleri: ileri migration + rollback migration testten gecmelidir.
3. Backfill testleri: eski kayitlarin `tenant_id` atamasi deterministik olmalidir.
4. Retention job testleri: `90/180/365 gun` kurallari dogrulanmalidir.

## 17. Rollout ve Asamalar

### 17.1 Faz 0 (1 hafta) - Foundation
1. Monorepo ve OSS dosyalari.
2. CI pipeline ve local compose.
3. Mock data + test fixture.
4. Entry/Exit gate ve rollback kriterleri tanimli.

### 17.2 Faz 1 (4 hafta) - Core Feed MVP
1. OAuth, ingest, normalize, ranking cekirdegi.
2. Digest/live UI.
3. Feedback loop v1.
4. Session limit ve time-saved ekrani.
5. Entry Criteria: Faz 0 ciktilari tamam, local environment green.
6. Exit Criteria: `FR-001..FR-007` testleri gecmis, `NFR-001` saglanmis.
7. Rollback Trigger: feed p95 hedefi 24 saat boyunca asilir veya kritik auth hatasi gorulur.

### 17.3 Faz 2 (3 hafta) - Save ve Recall
1. Save kutuphanesi.
2. Semantik arama ve dogal dil ask endpoint.
3. Haftalik review uretimi.
4. Revisit queue.
5. Entry Criteria: Faz 1 production-like ortamda stabil.
6. Exit Criteria: `FR-008..FR-013` testleri gecmis, `NFR-002` ve `NFR-003` saglanmis.
7. Rollback Trigger: `saved/ask` hata orani > `%3` veya veri butunlugu ihlali tespit edilir.

### 17.4 Faz 3 (3 hafta) - Trust, Policy, Agent Hardening
1. Trust engine.
2. Policy engine.
3. Agent cold-path rafine akislari.
4. Counter-view ve skip-impact kartlari.
5. Entry Criteria: Faz 2 olcumleri hedef aralikta.
6. Exit Criteria: `FR-014..FR-016` ve kalite testleri (16.3) gecmis, fallback senaryolari gecmis.
7. Rollback Trigger: trust/policy degisikligi feed kalitesinde ciddi regresyon yaratir.

### 17.5 Faz 4 (2 hafta) - OSS Beta ve Hardening
1. Feature flags ve A/B.
2. Kapali beta ve tuning.
3. Acik beta.
4. Go-live hazirlik kontrolu.
5. Entry Criteria: Faz 3 KPI trendleri stabil.
6. Exit Criteria: 20.2 Go kriterlerinin tamami saglanmis.
7. Rollback Trigger: beta doneminde kritik guvenlik veya veri kaybi olayi.

## 18. Uygulama Backlog'u

### 18.1 Epikler
1. `EPIC-001` Platform Foundation
2. `EPIC-002` Ingestion and Normalization
3. `EPIC-003` Ranking and Delivery
4. `EPIC-004` Feedback Learning
5. `EPIC-005` Save and Recall
6. `EPIC-006` Trust and Policy
7. `EPIC-007` AI Agent Layer
8. `EPIC-008` OSS Packaging
9. `EPIC-009` Observability and SRE

### 18.2 Her Gorev Icin Zorunlu Sablon
1. `Task ID`
2. `Owner`
3. `Dependencies`
4. `Definition of Done`
5. `Test Cases`
6. `Risk`
7. `Rollback Plan`

### 18.3 DoD Genel Kurallari
1. Kod + test + dokumantasyon tamam olmalidir.
2. API ve event sozlesmeleri guncel olmalidir.
3. Metrics dashboard paneli ekli olmalidir.
4. Security ve privacy checklist gecilmis olmalidir.
5. Traceability matrix guncellenmis olmalidir.

### 18.4 OSS Release Checklist
1. `LICENSE` dosyasi (Apache-2.0) repoda mevcut olmalidir.
2. `README.md` icinde quickstart (API key ile ve API key olmadan fallback) bulunmalidir.
3. `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` mevcut olmalidir.
4. `.github/ISSUE_TEMPLATE/*`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS` mevcut olmalidir.
5. `docker compose up` ile local calisan referans kurulum dogrulanmalidir.
6. Demo dataset ve mock provider ile en az bir e2e senaryo calismalidir.
7. OSS release tag oncesi `Implement-Ready Checklist` tekrar dogrulanmalidir.

## 19. Traceability Matrix (FR/NFR -> API/Event -> Test)
| Gereksinim | API/Event | Test |
|---|---|---|
| FR-001..FR-004 | `/v1/feed`, `/v1/feedback`, `ranking.completed` | 16.1, 16.2 |
| FR-005..FR-007 | `content.clustered`, `trust.updated` | 16.3 |
| FR-008..FR-013 | `/v1/saved*`, `saved.*` | 16.1, 16.5 |
| FR-014..FR-016 | `/v1/session/*`, `policy.session.completed` | 16.1, 16.5 |
| NFR-001..NFR-004 | feed/save/ask API + queue events | 16.2 |
| NFR-005..NFR-007 | platform load + availability + observability | 16.2, 18.4 |
| NFR-008..NFR-009 | auth/deletion API + audit events | 16.4 |
| NFR-010..NFR-011 | live refresh + rate limit politikalari | 16.2 |
| NFR-012..NFR-014 | pik trafik + provider timeout + queue burst | 16.2, 16.7 |
| NFR-015 | retention ve purge politikalari | 16.7 |

## 20. Implement-Ready Checklist (Go/No-Go)

### 20.1 No-Go Kriterleri
1. Kontratlar eksikse.
2. SLA/NFR numeric degerleri cakisiyorsa.
3. Event envelope alanlari eksikse.
4. Oturum politikasi disinda mod metni varsa.
5. Traceability satirlari eksikse.
6. Fazlar icin Entry/Exit/Rollback kriterleri tanimsizsa.
7. Endpoint durum matrisi veya event schema kurallari eksikse.

### 20.2 Go Kriterleri
1. Tum kilit kararlar plan icinde tek kaynaktan okunabiliyor.
2. FR/NFR -> API/Event -> Test izlenebilirligi tam.
3. Uyum matrisi ve teknoloji surumleri net.
4. LLM stratejisi ve anahtarsiz fallback davranisi net.
5. Guvenlik ve deletion SLA acik ve testlenebilir.
6. Faz 1-4 gecis kriterleri olculebilir ve test maddelerine bagli.
7. BYOK key lifecycle, schema versioning ve retention kurallari test planina bagli.

## 21. Varsayimlar ve Defaultlar
1. Proje tamamen OSS olarak yayinlanacaktir.
2. v1.0 kaynak kapsami yalnizca Twitter/X + RSS'dir.
3. Arayuz dagitimi Web PWA only'dir.
4. LLM stratejisi BYOK API-only'dir.
5. API anahtari yoksa deterministic fallback aciktir.
6. DB zorunludur: PostgreSQL + pgvector.
7. Queue zorunludur: Redis + BullMQ.
8. Oturum politikasi `10 dk` ve `15 dk`, varsayilan `15 dk`.
9. Hard delete SLA `<= 30 gun`.

## 22. Kaynaklar (Uyumluluk Dogrulamasi)
1. Fastify v5 Migration Guide: https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/
2. Fastify LTS: https://fastify.dev/docs/v5.7.x/Reference/LTS/
3. Next.js Installation: https://nextjs.org/docs/pages/getting-started/installation
4. Next.js Supported Browsers: https://nextjs.org/docs/architecture/supported-browsers
5. Node.js releases: https://nodejs.org/en/about/previous-releases
6. PostgreSQL versioning: https://www.postgresql.org/support/versioning/
7. pgvector repo: https://github.com/pgvector/pgvector
8. BullMQ guide: https://docs.bullmq.io/guide/connections

## 23. Cikarim Notu
1. `Web PWA only + moduler monolith + BYOK API-only + deterministic fallback` kombinasyonu, OSS kurulum bariyerini dusurmek ve contributor onboarding'i hizlandirmak icin secilmistir.
