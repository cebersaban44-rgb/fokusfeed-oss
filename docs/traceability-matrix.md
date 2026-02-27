# Traceability Matrix (Working Copy)

| Requirement Group | Implemented In | Test Coverage |
|---|---|---|
| FR-001..FR-004 | `apps/api/src/routes/feed.ts`, `apps/api/src/routes/feedback.ts`, `packages/domain/src/ranking.ts` | `apps/api/tests/api.test.ts`, `packages/domain/tests/ranking.test.ts` |
| FR-005..FR-007 | `packages/domain/src/ranking.ts` | `packages/domain/tests/ranking.test.ts` |
| FR-008..FR-013 | `apps/api/src/routes/saved.ts` | `apps/api/tests/api.test.ts` |
| FR-014..FR-016 | `apps/api/src/routes/session.ts`, `apps/web/app/session/end/page.tsx` | `apps/api/tests/api.test.ts` |
| NFR-001..NFR-004 | API route handlers + worker queue setup | API integration tests + worker unit tests |
| NFR-008..NFR-009 | `apps/api/src/lib/crypto.ts`, migration + deletion model | `apps/api/tests/api.test.ts` |
| NFR-010..NFR-011 | `/v1/feed` live window text + in-memory rate limiting | `apps/api/tests/api.test.ts` |
| NFR-013..NFR-014 | fallback logic + queue options/retry policy | `apps/api/tests/api.test.ts`, `apps/worker/tests/worker.test.ts` |
| NFR-015 | retention fields + worker retention stub | `apps/worker/tests/worker.test.ts` |
