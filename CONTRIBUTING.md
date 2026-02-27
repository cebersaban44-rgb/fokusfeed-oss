# Contributing

## Development Flow

1. Create a feature branch.
2. Implement with tests.
3. Keep API/event contracts aligned with `PLAN.md`.
4. Run `npm run typecheck && npm run test && npm run build`.
5. Open a pull request using the PR template.

## Pull Request Requirements

- Include test evidence.
- Update docs if behavior changes.
- Keep idempotency, tenant isolation, and fallback behavior intact.

## Commit Style

Use concise, scoped commits, for example:
- `feat(api): add saved ask endpoint`
- `test(domain): add ranking tie-break tests`

## Code of Conduct

By participating, you agree to follow `CODE_OF_CONDUCT.md`.
