# ADR-0001: v1.0 Baseline Architecture

## Status
Accepted

## Context
The product requires a web-only OSS architecture with deterministic fallback when no user BYOK key is configured.

## Decision
- Monorepo with `apps/{web,api,worker}` and shared packages.
- Fastify v5 API, Next.js web app, BullMQ worker.
- PostgreSQL + pgvector + Redis.
- Deterministic fallback always available.

## Consequences
- Contributors can run locally with no provider key.
- Event/API contracts are centralized in `packages/shared-types`.
- Worker and API are horizontally scalable with shared queue/db backends.
