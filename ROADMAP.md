# Roadmap

## Core Philosophy
- Prioritize high-performance, deterministic AI workflows.
- Maintain rigorous test coverage and continuous verification.
- Enforce strict typing, consistent UI states, and offline-resilient operations.

## Status Baseline (audited 2026-02-26)

This roadmap has been re-baselined against current code state after completing the full P0–P4 execution backlog.

## ✅ Solidly Implemented Foundations

- Session lifecycle UI and activity feed core loop (`components/session-list.tsx`, `components/activity-feed.tsx`)
- Session Keeper daemon + persisted settings/logs (`server/daemon.ts`, `server/index.ts`)
- Debate + code review orchestration endpoints and persistence (`app/api/debate/*`, `app/api/review/route.ts`)
- Templates CRUD data model and API (`app/api/templates/*`)
- System status/submodule introspection API (`app/api/system/*`)
- Standardized error contracts across all APIs (`lib/api/error.ts`)
- Request IDs/correlation IDs and structured logging (`lib/api/error.ts`)
- Diagnostics endpoint for operational health checks (`app/api/system/status/route.ts`)
- Comprehensive API route tests (11+ suites, 63+ tests passing)
- E2E Playwright suite covering critical user journeys
- CI quality gates (lint, typecheck, test, build, doc-drift checks)
- Multi-provider dashboard with real provider implementations (`app/dashboard/providers/page.tsx`)
- Session transfer state machine with observable checkpoints (`app/api/transfers/*`)
- Plugin manifest schema validation and backend registry (`app/api/plugins/*`)
- Plugin capability permissions and runtime boundaries (`app/api/plugins/execute/route.ts`)

## ✅ Completed in P4 Expansion Phase

### OAuth & Multi-User Model (Phase 14 — Complete)
- ✅ NextAuth v5 OAuth via GitHub with Prisma adapter
- ✅ User/Workspace/WorkspaceMember data model
- ✅ Automatic "Personal Workspace" provisioning on signup
- ✅ Per-workspace data isolation across all API routes (templates, debates, settings, transfers)
- ✅ JWT session strategy with `workspaceId` on session objects

### Advanced Plugin Ecosystem (Phase 15 — Complete)
- ✅ Marketplace ingestion pipeline (`POST /api/plugins/ingest`)
- ✅ Ed25519 cryptographic signature verification (`lib/crypto/signatures.ts`)
- ✅ Plugin execution sandbox with per-workspace daily quotas
- ✅ Comprehensive `PluginAuditLog` for all execution events
- ✅ Enhanced Zod schemas with `signature`, `publicKey`, `status` fields

### Intelligent Provider Routing (Phase 16 — Complete)
- ✅ `ProviderTelemetry` model tracking token usage and USD costs
- ✅ `RoutingPolicy` model for per-workspace, per-task-type routing overrides
- ✅ Intelligent routing engine (`lib/routing/engine.ts`) with cost-efficiency fallbacks
- ✅ `Workspace.monthlyBudget` enforcement with `402 Payment Required` on breach
- ✅ Routing simulation API (`POST /api/routing/simulate`) for cost previewing
- ✅ Static pricing matrix for OpenAI, Anthropic, and Google models

## 🟡 Partially Implemented / Gaps Remaining

### Frontend UI Gaps
- Provider dashboard exists but several providers still show mock/demo badges
- Plugin marketplace page (`app/plugins/page.tsx`) needs to consume the new ingestion API
- Routing simulation UI does not yet exist (backend API is ready)
- Analytics dashboard uses simulated data for some metrics
- Terminal demo page exists but is not fully wired to `terminal-server/`

### Submodule Dashboards
- `TaskQueueDashboard`, `McpServerDashboard`, and `TerminalStream` components still use mock datasets
- Need to wire to real backend signals from `external/jules-task-queue` and `external/*-mcp`

### Split-Brain API Surfaces
- Daemon (`server/`) and Next.js API routes still have overlapping REST endpoints
- `JulesClient` in `lib/jules/client.ts` still calls `http://localhost:8080` for some operations

### Docker Deployment
- `Dockerfile` and production `docker-compose.yml` not yet created
- `DEPLOY.md` references Docker as "pending implementation"

## ❌ Not Yet Implemented (Future Roadmap)

- Full real-time event architecture (WebSocket/SSE replacing polling)
- Deep Context RAG (codebase indexing for enhanced agent understanding)
- Shadow Pilot Mode (silent Council background monitoring)
- Workflow Automation (multi-step Feature → Test → PR → Merge chains)
- Agent Scaling (automatic parallel session spawning)
- Mobile Emergency Triage ("One-Tap Approve Fix")
- Conference-mode dedicated UI flow (backend action exists, no first-class UX)

## Priority Execution Plan

### Phase Next — UI Completeness & Polish
1. Build Routing Simulation UI page consuming `/api/routing/simulate`.
2. Wire Plugin marketplace to use the ingestion API and display signature status.
3. Connect submodule dashboards to real backend data.
4. Add routing/budget/quota widgets to Settings page.

### Phase Next+1 — Infrastructure
1. Create production `Dockerfile` and `docker-compose.yml`.
2. Implement real-time event push (SSE/WebSocket) for session activity feeds.
3. Consolidate daemon vs Next.js API split-brain endpoints.

### Phase Next+2 — Advanced Intelligence
1. Implement RAG-based deep context for codebase understanding.
2. Build Shadow Pilot background monitoring mode.
3. Add multi-step workflow automation engine.

## Notes

- Detailed ordered implementation backlog lives in `TODO.md`.
- Detailed session handoff notes live in `HANDOFF.md`.
- Creative improvement ideas live in `IDEAS.md`.
