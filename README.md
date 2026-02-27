# FokusFeed OSS v1.0

FokusFeed is a web-first personal intelligence feed that helps users consume high-value updates without opening a noisy social timeline.

This repository implements an end-to-end v1.0 baseline aligned with `PLAN.md`:
- Web PWA (`apps/web`)
- Fastify API (`apps/api`)
- Worker + queue (`apps/worker`)
- Shared contracts (`packages/shared-types`)
- Domain logic (`packages/domain`)
- Config + fixtures (`packages/config`, `packages/test-utils`)
- Infra (`infra/`)

## Requirements

- Node.js `>=20.9` (target policy: Node `24`)
- npm `>=10`
- Docker (for Postgres + Redis)

## Quickstart

1. Install dependencies.

```bash
npm install
```

2. Copy environment files.

```bash
copy apps\\api\\.env.example apps\\api\\.env
copy apps\\worker\\.env.example apps\\worker\\.env
copy apps\\web\\.env.example apps\\web\\.env.local
```

3. Start local infra.

```bash
docker compose -f infra/docker-compose.yml up -d
```

4. Run database migration.

```bash
# Example with psql installed
psql "postgresql://postgres:postgres@localhost:5432/fokusfeed" -f infra/db/migrations/0001_init.sql
```

5. Start apps.

```bash
npm run dev
```

- API: `http://localhost:3001`
- Web: `http://localhost:3000`
- Worker: starts queue consumers

## Running Without BYOK Key (Deterministic Fallback)

No LLM key is required for local usage.
- The API will return deterministic summaries/reasons.
- `meta.generationMode` will be `"deterministic"`.

## Running With BYOK Key

1. Call `POST /v1/profile/llm-key` with:

```json
{ "provider": "openai", "apiKey": "your-provider-key" }
```

2. Subsequent generation endpoints (for example `POST /v1/saved/ask`) will return `meta.generationMode = "llm"`.

## Key Commands

```bash
npm run typecheck
npm run test
npm run build
```

## Monorepo Layout

```text
apps/
  api/
  web/
  worker/
packages/
  config/
  domain/
  shared-types/
  test-utils/
docs/
infra/
```

## API Conventions

- All endpoints are under `/v1`.
- Write endpoints require `Idempotency-Key`.
- Every response includes `requestId`.
- Cursor pagination defaults to `limit=20`, max `50`.

## Security and Privacy

- LLM and OAuth keys are encrypted at application layer.
- Tenant isolation is mandatory in request context.
- Deletion workflow and audit retention are modeled in schema + worker stubs.

## License

Apache-2.0
