# Project Handoff: Jules Autopilot (v0.9.1 - Lean Core)

## Current State Fast-Forward
We have just completed a major architectural shift: the **Lean Core Pivot**. The project has been stripped of its "Enterprise" bloat (Analytics, Swarms, Side Logs, Submodules) to focus on a high-performance, single-workspace Jules orchestration experience.

The architecture is now centralized: a high-performance Bun-based API daemon (port 8080) handles all logic, including Jules API proxying and filesystem access, while the Next.js frontend integrates via a transparent proxy at `/api/local/`.

## Major Accomplishments This Session
1. **Enterprise Feature Pruning:** Deleted the `external/` directory and all associated submodule logic. Excised heavy analytics and multi-agent swarm components.
2. **API Centralization:** Moved core logic into `server/index.ts`. Implemented native proxies for `/sessions` and `/activities` to bypass official Jules UI lag.
3. **Mock Data Fallback:** The daemon now automatically serves deterministic mock data if no Jules API key is configured, allowing immediate dashboard exploration.
4. **Resilient Infrastructure:** Made Redis and BullMQ optional to ensure the daemon starts reliably in any environment. Fixed Prisma engine file-locking issues.
5. **Auth Optimization:** Consolidated NextAuth configuration into root `auth.ts`. Removed database adapters for local development to prevent schema conflict loops.
6. **Documentation Overhaul:** Updated `ROADMAP.md`, `VISION.md`, and `UNIVERSAL_LLM_INSTRUCTIONS.md` to reflect the minimalist, "Lean Core" philosophy.

## Current Environment
- **Frontend:** Next.js 15 on port 3006 (or 3000).
- **Backend:** Bun/Hono on port 8080 (Proxied via `/api/local/`).
- **Database:** Prisma + SQLite (`prisma/dev.db`).
- **Shared Package:** Types and utilities extracted to `@jules/shared`.

## Next Agent Objectives (See `TODO.md`)
- **Action 1:** Refine the TUI experience in `apps/cli` to use the new centralized `/api/local` endpoints.
- **Action 2:** Implement native RAG integration in the Bun daemon for deep codebase context.
- **Action 3:** Enhance the session view to support real-time WebSocket updates for activity logs.

## Critical Instructions for Inheriting Agent
The project is now a "Lean Core." Do not re-add enterprise bloat unless explicitly requested. Always use the `/api/local/` proxy for frontend-to-daemon communication. **Run `npx tsc --noEmit` after changes to ensure type safety.** The backend is designed to be "always functional" via mock fallbacks; maintain this pattern.
