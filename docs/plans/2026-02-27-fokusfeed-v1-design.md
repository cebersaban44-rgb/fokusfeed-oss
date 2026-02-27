# 2026-02-27 FokusFeed v1.0 Design

## Scope
Deliver an implement-ready, end-to-end baseline aligned with `PLAN.md`.

## Recommended Approach
Approach A (selected): full monorepo baseline with working API/web/worker, deterministic fallback, contracts, migrations, tests, and CI.

## Architecture
- `apps/web`: Next.js PWA routes for onboarding, digest, live, saved, ask, review, profile, session end, settings.
- `apps/api`: Fastify v5 API implementing `/v1` contract surface and idempotent write semantics.
- `apps/worker`: BullMQ workers for ingest/feature/ranking/saved/policy/trust/review operations.
- `packages/shared-types`: API/event contract types + JSON schemas.
- `packages/domain`: deterministic scoring/reason logic and policy helpers.

## Data and Events
- SQL migration defines core relational tables and pgvector usage.
- Event envelope and per-event schemas versioned under `packages/shared-types/events`.

## Reliability and Security
- Tenant/user context enforced in API pre-handler.
- Rate limits by endpoint class.
- Application-level encryption helpers for BYOK key storage.
- Deterministic fallback remains functional without external LLM provider.

## Validation
- Domain unit tests for ranking and counter-view behavior.
- API integration tests for auth, validation, idempotency, and generation mode.
- Worker tests for envelope and queue policy defaults.
