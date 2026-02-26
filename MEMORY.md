# Context & Memory

This file serves as a persistent memory bank for AI agents to document observations, debugging gotchas, and specific repository design patterns that aren't documented in normal README files.

## Architectural Truths (Feb 2026)

### Split Brain Avoidance
We have a Next.js App Router (HTTP/API) AND a Bun/Hono Daemon (WebSocket + specialized tasks) at `server/index.ts`. Avoid duplicating business logic between them. If logic must be shared, pull it into the `@jules/shared` workspace package.

### Port 8080 Conflicts
The Daemon specifically binds to port 8080. If it crashes, PID locking is common. Run `netstat -ano | findstr :8080` (Windows) or `lsof -i:8080` (Unix) to kill stale instances before restarting.

### Prisma SQLite
We use LibSQL via Prisma (`@prisma/adapter-libsql`). Schema changes require `npx prisma db push` (not `prisma migrate dev` due to rapid prototyping). Ensure `.env` contains `DATABASE_URL="file:./dev.db"`.

### SearchCommandDialog Accessibility
Radix dialogs strictly enforce having a `DialogTitle`. Always include `<DialogTitle className="sr-only">Title</DialogTitle>` to prevent screen-reader errors.

### ESM Import Chain in Tests
`next-auth` and `@auth/core` are ESM-only packages. Jest must be configured with `transformIgnorePatterns` excluding these packages, and test files should mock `@/lib/session` and `@/auth` to prevent Jest from resolving the full ESM import chain. The `jest.config.js` has `moduleNameMapper` for `@jules/shared` to resolve pnpm workspace packages.

### Prisma Mock Pattern
When mocking Prisma in Jest tests for models that were recently added (e.g., `providerTelemetry`, `routingPolicy`, `pluginAuditLog`), the IDE may show type errors because the generated Prisma client hasn't been regenerated in the IDE's TS server. Use `(prisma as any).modelName` casting in test files to suppress these false positives. The tests will pass correctly because the mock structure matches at runtime.

## Agent Execution Guidelines

### Frontend vs Backend Errors
Do not confuse Next.js router fetch errors with Bun Daemon fetch errors. Check the port and endpoint to determine origin.

### Submodule Awareness
When editing a file, verify if it belongs to an `external/*` submodule. If so, commit it in the submodule first, then commit the pointer update in the main repository.

### Version Source of Truth
`VERSION.md` is the single canonical version. After updating it, run `node scripts/update-version.js` to sync. Never hardcode version numbers elsewhere — import from `lib/version.ts`.

### Workspace Data Isolation
All API routes that read or write user data must filter by `session.workspaceId`. Never return data belonging to other workspaces. The `getSession()` function from `lib/session.ts` returns the authenticated workspace context.

### Plugin Security
Plugin manifests submitted via `/api/plugins/ingest` must pass Ed25519 signature verification before being persisted. The `lib/crypto/signatures.ts` module handles this. Unsigned or tampered plugins are rejected with `403 Forbidden`.

### Provider Routing Budget
The routing engine (`lib/routing/engine.ts`) automatically switches to cost-efficient models when the workspace's remaining monthly budget drops below $10.00. At $0.00, all LLM execution is blocked with `402 Payment Required`.

## Design Preferences (as stated by user)

- Dark mode default, mobile-first responsive design.
- Premium, modern UI aesthetics — avoid generic/plain styling.
- Comprehensive documentation: every feature should have UI representation, API behavior, and test coverage.
- Code comments should explain *why*, not just *what*. Self-explanatory code needs no comments.
- All agent instruction files should reference `LLM_INSTRUCTIONS.md` as the universal source.
- Version bumps happen with every build/feature. Changelogs are mandatory.
- Git commit and push after each major step. Do not accumulate large uncommitted diffs.
- Feature branches (especially AI-created ones) should be merged into main regularly.
