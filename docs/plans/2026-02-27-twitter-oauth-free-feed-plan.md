# 2026-02-27 Twitter/X OAuth + Feed Plan (Free Plan Uyumlu)

## 1. Amaç

Bu planin hedefi, FokusFeed icinde Twitter/X iceriklerini gercek OAuth baglantisi ile cekip feed olarak gostermektir.

Kritik gercek: X Free plani ile tam "home timeline parity" (tum following hesaplarinin tam akisinin surekli cekilmesi) maliyet/kota nedeniyle pratik degildir. Bu nedenle sistem, Free plan ile uyumlu bir "kota butceli feed" modeliyle calisacaktir.

## 2. Kapsam Karari

### 2.1 Dahil

1. Gercek OAuth 2.0 (Authorization Code + PKCE) baglantisi
2. Token saklama/sifreleme ve yenileme
3. Twitter verisini cekip `content_items` icine yazan ingest akisi
4. Free kota butcesine gore kontrollu feed uretimi
5. Kota tukenince deterministic fallback + kullanici bilgilendirme

### 2.2 Dahil Degil (Bu sprint)

1. Tum following hesaplarinin yuksek frekansta tam timeline senkronizasyonu
2. Premium/Basic/Pro plan gecis otomasyonu
3. Coklu sosyal aglar

## 3. Secenekler ve Tercih

### Secenek A - Free-Strict (Onerilen)

- OAuth + token lifecycle tam kurulur.
- Twitter okuma cagrilari aylik butceyle merkezi yonetilir.
- Following verisi "tam timeline" yerine oncelikli/ilgili hesaplar ile sinirlanir.
- Kota bitince RSS + cache + deterministic fallback devreye girer.

Artisi: Free planla uyumlu, OSS icin surdurulebilir.
Eksisi: Twitter tarafi kapsami sinirlidir.

### Secenek B - ToS-riskli Scrape yaklasimi (Reddedildi)

- Resmi API disi yollarla timeline taklidi.
- Platform kosullarina ve hukuki guvenlige risk.

Neden reddedildi: OSS ve guvenlik hedefleriyle uyumsuz.

### Secenek C - Tier Upgrade'e bagli tam feed

- Kullanici/proje Basic+ plana cikarsa tam kapsama yaklasilir.

Artisi: Urun hedefiyle daha uyumlu timeline.
Eksisi: Free plan hedefiyle celisir.

## 4. Free Plan Kisitlarini Tasarima Isleme

1. `ReadBudgetManager` eklenecek.
2. Butce birimi request ve endpoint bazinda izlenecek.
3. Her isletim penceresinde (or. 10dk) per-user/per-tenant budget dagitimi yapilacak.
4. Butce altina dustugunde:
   - "following" kategorisinde oncelikli hesaplar cekilecek
   - "similar_likes" sadece secili endpointlerle sinirlanacak
   - "trend_now" daha seyrek yenilenecek
5. Butce tukenince API response metasi fallback modunu acikca gosterecek.

## 5. Mimari Degisiklikler

## 5.1 API Katmani

### Mevcut
- `POST /v1/auth/twitter/start` mock URL donduruyor.
- `GET /v1/auth/twitter/callback` sadece redirect yapiyor.

### Hedef
- `POST /v1/auth/twitter/start`
  - `state`, `code_verifier`, `code_challenge` uretecek
  - state kaydini TTL ile saklayacak
  - gercek authorize URL donecek
- `GET /v1/auth/twitter/callback`
  - `state` dogrulama
  - `code` -> token exchange
  - tokenlari sifreleyip DB'ye yazma
  - baglanti durumunu profile'a isleme

## 5.2 Worker Katmani

Yeni joblar:
1. `twitter.bootstrap-profile`
2. `twitter.ingest.following-priority`
3. `twitter.ingest.likes-similar`
4. `twitter.ingest.trends`
5. `twitter.refresh-token`

Hepsi `ReadBudgetManager` kontrolu ile calisacak.

## 5.3 Veri Katmani

Mevcut tablolar kullanilacak:
- `oauth_tokens_encrypted`
- `sources`
- `content_items`
- `content_features`

Yeni tablo onerisi:
- `oauth_state_sessions`
  - `tenant_id`, `user_id`, `state_hash`, `code_verifier_ciphertext`, `expires_at`, `used_at`

Yeni alan onerisi (`sources`):
- `priority_score` (following onceliklendirme icin)
- `source_type_detail` (twitter_user, twitter_topic, rss)

## 6. API Sozlesme Guncellemeleri

1. `POST /v1/auth/twitter/start`
   - Request: bos body + `Idempotency-Key`
   - Response: `{ authUrl, state, expiresAt }`
2. `GET /v1/auth/twitter/callback`
   - Query: `state`, `code`
   - Success: onboarding redirect + connection flag
3. `GET /v1/profile/twitter/status` (yeni)
   - `{ connected: boolean, lastSyncAt?: ISO, readBudget: { used, remaining, window } }`

## 7. Feed Davranisi (Twitter postu odakli)

Feed kartlari `source="twitter"` agirlikli olacak.

Kategori yorumlari:
1. `following`: kullanicinin oncelikli takip ettigi hesaplardan son postlar
2. `similar_likes`: kullanicinin begeni sinyaline benzer postlar
3. `must_see`: trust+urgency yuksek postlar
4. `trend_now`: trend/topic endpointlerinden secili postlar

Kota dusukse oncelik sirasi:
1. must_see
2. following
3. similar_likes
4. trend_now

## 8. Guvenlik

1. PKCE zorunlu
2. `state` replay korumasi
3. Tokenlar plaintext loglanmaz
4. Token sifreleme (`apps/api/src/lib/crypto.ts`) kullanilir
5. Callback endpointi rate-limit ve idempotency kontrollu olur

## 9. Test Stratejisi

1. Unit
   - PKCE/state uretimi
   - budget dagitimi
   - fallback aktivasyonu
2. Integration
   - `/auth/twitter/start` gercek authorize URL
   - callback code exchange mocked
   - token sifreli kayit
3. E2E
   - onboarding -> connect -> ingest -> `/v1/feed?mode=digest`
4. Failure tests
   - gecersiz state
   - token exchange timeout
   - read budget exhausted

## 10. Fazli Uygulama Plani

### Faz 1 - OAuth Foundation (2-3 gun)
- PKCE/state
- callback + token store
- profile status endpoint

### Faz 2 - Twitter Ingest v1 (3-5 gun)
- following-priority ingest
- content normalize + dedupe
- feede ilk gercek twitter postlari

### Faz 3 - Budget + Fallback Hardening (2-3 gun)
- ReadBudgetManager
- quota aware scheduling
- fallback mesajlari + metrics

### Faz 4 - Quality Pass (2-3 gun)
- relevans tuning
- must_see/trend_now dengeleme
- test + dokumantasyon tamam

## 11. GitHub Sureci (Bu plan icin)

1. Branch: `plan/twitter-oauth-free-feed`
2. Plan dokumani commit
3. PR acma
4. CI green olduktan sonra merge
5. Uygulama icin ayri issue/PR setleri:
   - `feat/oauth-pkce`
   - `feat/twitter-ingest-v1`
   - `feat/read-budget-manager`
   - `test/twitter-oauth-e2e`

## 12. Basari Kriterleri

1. Kullanici Twitter hesabini gercekten baglayabiliyor
2. Feedde gercek Twitter postu goruluyor
3. Free kota asiminda sistem ckmuyor, fallbacke geciyor
4. Token guvenligi ve log hijyeni testten geciyor

## 13. Riskler ve Azaltma

1. Free kota belirsiz/degisken olabilir
   - Azaltma: runtime configurable budget + admin alert
2. Endpoint erisim farkliliklari (app yetkisi)
   - Azaltma: capability check endpoint + graceful degradation
3. Cok sik refresh ile kota tuketimi
   - Azaltma: agresif cache + min poll interval

## 14. Referanslar (Resmi)

- X API access levels / Free tier: https://developer.x.com/en/support/x-api/v2
- X API pricing page: https://developer.x.com/en/pricing
- OAuth 2.0 PKCE (X docs): https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- OAuth token endpoint reference: https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token
