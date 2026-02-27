# GitHub Açık Kaynak Yayın ve Geliştirme Kılavuzu (FokusFeed)

Bu belge, projeyi profesyonel bir yazılımcı gibi lokalden geliştirip GitHub'da açık kaynak olarak yönetmek için operasyonel el kitabıdır.

## 1) Kısa Cevap: Gerçek yazılımcı nasıl yapar?

Evet, gerçek yazılımcı akışı şudur:
- Kodu **lokalde** yazar.
- Testi **lokalde** çalıştırır.
- Değişikliği bir **branch** üzerinde commitler.
- GitHub'a branch push eder.
- **PR** açar.
- CI geçince ve kontrol edince merge eder.
- `main` her zaman stabil kalır.

## 2) Bu Repo İçin Standartlar

- Ana dal: `main`
- `main` korumalı olmalı (PR zorunlu, CI zorunlu).
- CI job adı: `build-test`
- Commit formatı:
  - `feat(api): ...`
  - `fix(worker): ...`
  - `docs: ...`
  - `chore: ...`

## 3) İlk Kurulum (Bir Kez)

### 3.1 Lokal hazırlık

```bash
npm install
npm run typecheck
npm run test
npm run build
```

### 3.2 Ortam dosyaları

```bash
copy apps\\api\\.env.example apps\\api\\.env
copy apps\\worker\\.env.example apps\\worker\\.env
copy apps\\web\\.env.example apps\\web\\.env.local
```

### 3.3 Altyapı

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3.4 Veritabanı migration

```bash
psql "postgresql://postgres:postgres@localhost:5432/fokusfeed" -f infra/db/migrations/0001_init.sql
```

## 4) Günlük Çalışma Rutini (Her İşte Aynı)

### Adım 1: Önce Issue aç

Issue içinde şunları net yaz:
- Problem nedir?
- Beklenen sonuç nedir?
- Kabul kriterleri (testlenebilir).

Örnek kabul kriteri:
- `POST /v1/saved/ask` için invalid query durumunda `422 VALIDATION_ERROR` dönmeli.

### Adım 2: Branch aç

```bash
git checkout main
git pull
git checkout -b feat/saved-ask-validation
```

Fix için:

```bash
git checkout -b fix/session-rate-limit
```

### Adım 3: Lokalde geliştir

- Küçük parçalar halinde ilerle.
- Her değişiklikte ilgili testleri çalıştır.

### Adım 4: Kalite kapısı (push öncesi zorunlu)

```bash
npm run typecheck
npm run test
npm run build
```

Hepsi geçmeden push etme.

### Adım 5: Commit at

```bash
git add .
git commit -m "feat(api): enforce saved ask validation"
```

### Adım 6: Branch'i GitHub'a gönder

```bash
git push -u origin feat/saved-ask-validation
```

### Adım 7: Pull Request aç

PR açıklaması:
- Ne değişti?
- Neden değişti?
- Nasıl test edildi? (komut + çıktı özeti)
- Kırılma riski var mı?

### Adım 8: CI sonucunu bekle

- `build-test` geçmeli.
- Geçmezse fix commit at, aynı branch'e push et.

### Adım 9: Merge

- Tercih: **Squash and merge**
- Sonra branch sil:

```bash
git branch -d feat/saved-ask-validation
git push origin --delete feat/saved-ask-validation
```

## 5) Bug Fix / Hotfix Akışı

### Ne zaman hotfix?

- Production'ı bozan bug
- Güvenlik açığı
- Kritik endpoint hatası

### Akış

1. `main`den `fix/...` branch aç.
2. Önce failing test ekle (mümkünse).
3. Fix'i yaz.
4. `typecheck + test + build` geçir.
5. PR aç.
6. Hızlı merge.
7. `PATCH` release çıkar (`v1.0.1` gibi).

## 6) Ne Zaman Neyi Nereye Gönderiyorum?

### A) Gün içinde çalışırken

- Sık sık local commit atabilirsin.
- GitHub'a göndermek için branch push yaparsın.
- `main`e direkt push yapmazsın.

### B) İş bitince

- Branch push + PR.
- CI geçince merge.

### C) Hata geldiğinde

- Hatanın fix branch'i + PR.
- Mümkünse aynı gün patch release.

### D) Dokümantasyon güncellemesi

- Doküman da kod kadar önemlidir.
- Yine branch + PR ile gönder.

## 7) Release Yönetimi (SemVer)

- `MAJOR.MINOR.PATCH`
- `feat` -> `MINOR`
- `fix` -> `PATCH`
- breaking change -> `MAJOR`

Örnek:
- `v1.0.0` ilk stabil
- `v1.0.1` bugfix
- `v1.1.0` yeni özellik

Release adımları:

```bash
git checkout main
git pull
git tag v1.0.1
git push origin v1.0.1
```

GitHub Releases ekranından not gir:
- Öne çıkan değişiklikler
- Migration etkisi
- Bilinen sınırlamalar

## 8) PR Açıklama Şablonu (Pratik)

## Summary
- X endpointinde doğrulama eklendi
- Y durumda hata kodu standartlaştırıldı

## Why
- Plan gereksinimi FR-xxx / NFR-xxx uyumu

## Test Plan
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Risk
- Düşük / Orta / Yüksek + neden

## 9) Branch İsimlendirme Kuralları

- Özellik: `feat/<kısa-konu>`
- Fix: `fix/<kısa-konu>`
- Doküman: `docs/<kısa-konu>`
- Bakım: `chore/<kısa-konu>`

Örnekler:
- `feat/feed-counter-view`
- `fix/idempotency-conflict`
- `docs/release-playbook`

## 10) Minimum "Done" Kontrolü (Merge Öncesi)

- Kod tamam
- Testler eklendi/güncellendi
- CI geçti
- Dokümantasyon güncellendi
- Güvenlik etkisi değerlendirildi

## 11) Sık Yapılan Hatalar

- Direkt `main`e push yapmak
- Testsiz PR açmak
- Büyük tek commit atmak
- PR açıklamasını boş bırakmak
- Kırıcı değişikliği release notuna yazmamak

## 12) Güvenlik Notu (Çok Önemli)

- Personal Access Token (PAT) hiçbir zaman chat'e, README'ye, koda veya commit'e yazılmaz.
- Token sızarsa hemen iptal edilip yenisi üretilir.
- Tercihen fine-grained token ve minimum yetki kullanılır.

## 13) Hızlı Komut Özeti

Yeni iş:

```bash
git checkout main
git pull
git checkout -b feat/my-change
```

Doğrula + gönder:

```bash
npm run typecheck
npm run test
npm run build
git add .
git commit -m "feat(scope): message"
git push -u origin feat/my-change
```

Temizlik:

```bash
git checkout main
git pull
git branch -d feat/my-change
git push origin --delete feat/my-change
```

---

Bu kılavuz, repo büyüdükçe güncellenmelidir. Yeni contributor geldiğinde önce bu dosya okutulmalıdır.
