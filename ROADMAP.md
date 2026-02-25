# Roadmap

## Core Philosophy
- Prioritize high-performance, deterministic AI workflows.
- Maintain rigorous test coverage and continuous verification.
- Enforce strict typing, consistent UI states, and offline-resilient operations.
## Status baseline (audited 2026-02-16)

This roadmap has been re-baselined against the current code and docs state. Prior entries that were marked complete but are actually mock-only, partial, or not fully wired are now reflected accurately.

## ✅ Solidly implemented foundations

- Session lifecycle UI and activity feed core loop (`components/session-list.tsx`, `components/activity-feed.tsx`, `lib/jules/client.ts`)
- Session Keeper daemon + persisted settings/logs (`server/daemon.ts`, `server/index.ts`, `app/api/settings/keeper/route.ts`)
- Debate + code review orchestration endpoints and persistence (`app/api/debate/*`, `app/api/review/route.ts`, `prisma/schema.prisma`)
- HTTP-only cookie auth flow for primary app access (`lib/session.ts`, `middleware.ts`, `app/login/page.tsx`)
- Templates CRUD data model and API (`app/api/templates/*`, `prisma/schema.prisma`)
- System status/submodule introspection API (`app/api/system/status/route.ts`, `app/api/system/submodules/route.ts`)

## 🟡 Partially implemented / requires wiring

### Multi-provider cloud dev
- Unified types/store/provider registry are present.
- Reality: only `jules` provider is materially implemented; others are stub/mock or throw `ProviderNotImplementedError`.
- Gaps:
  - Full provider APIs for `devin`, `manus`, `openhands`, `github-spark`, `blocks`, `claude-code`, `codex`
  - Real transfer progress lifecycle (currently coarse status + local state)
  - Robust provider health checks and retries

### Plugin system
- `/plugins` exists, but uses static plugin cards + localStorage install toggles.
- No backend plugin registry, loading, sandboxing, manifest spec, permission model, or execution runtime.

### Submodule dashboards
- System views exist, but several submodule detail actions are explicit placeholders.
- `TaskQueueDashboard`, `McpServerDashboard`, and `TerminalStream` components currently use mock/demo datasets rather than live integrations.

### Templates + memory + settings split-brain
- Next API routes and daemon routes both provide overlapping functionality (`templates`, `debate`, `settings`, `logs`).
- Client uses `http://localhost:8080` for template calls via `JulesClient`, bypassing equivalent Next routes.
- Requires a single source of truth and transport strategy.

### Auth/account UX consistency
- Core auth is cookie-based.
- Account page copy still describes browser localStorage for API key storage, which is outdated/misleading in current architecture.

## ❌ Not implemented (but planned/claimed previously)

- OAuth/multi-user accounts and workspace-level isolation
- Production plugin ecosystem
- Full real-time event architecture replacing polling in major surfaces
- Comprehensive E2E coverage (current Playwright set is limited)
- Unified cost/billing tracking across providers
- Conference-mode dedicated UI flow (backend action exists, no first-class UX)

## Priority execution plan

### Phase A — Truth and consistency (immediate)
1. Unify docs with code reality (this update + follow-up doc harmonization).
2. Resolve version drift (`VERSION*` vs `package.json` mismatch).
3. Consolidate duplicated API surfaces (Next vs daemon ownership).

### Phase B — Product integrity
1. Complete `TaskQueueDashboard` (currently static placeholder).
2. Complete `McpServerDashboard` (currently mock data).
3. Complete `TerminalStream` to use real `xterm.js` backend websockets.
4. Complete at least one non-Jules provider (e.g., `devin`, `manus`) end-to-end to validate abstraction.
5. Harden auth messaging and remove stale localStorage-sensitive guidance.

### Phase C — Scale and reliability
1. Expand automated tests (API + integration + E2E critical paths).
2. Improve realtime/event architecture where polling is still heavy.
3. Add formal API contracts and operational health checks.

### Phase D — Vision features
1. OAuth/multi-user support.
2. Plugin runtime + permissions model.
3. Full provider ecosystem maturity and auto-routing policies.

## Notes

- Detailed, ordered implementation backlog lives in `TODO.md`.
- Detailed audit methodology/findings and evidence references live in `HANDOFF.md`.
