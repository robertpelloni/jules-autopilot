# Architectural Memory & Codebase Observations

*This document is maintained autonomously by LLM agents to explicitly pass implicit codebase context to future sessions.*

## 1. The Daemon vs. Next.js API Split-Brain
**Observation:** The project originally spawned a standalone Hono server (`server/index.ts`) running on port 8080 to handle background tasks and LLM execution. Later, Next.js App Router API endpoints were introduced (`app/api/`). 
**Current State:** In v0.9.3, we formalized the **Jules Portal Authentication Protocol** (see `docs/AUTHENTICATION.md`). Tokens starting with `AQ.A` MUST use the `x-goog-api-key` header and MUST NOT use standard Bearer Authorization. We also implemented a "Safety Bridge" in the provider to handle function renaming without breaking the browser cache. **Future agents must maintain this header strategy to avoid API_KEY_SERVICE_BLOCKED errors.**

## 2. Docker Execution Strategy
**Observation:** The application relies natively on Docker Multi-Stage builds (deps -> builder -> runner). 
**Important Context:** The orchestrator utilizes a terminal side-bot. The `docker-compose.prod.yml` explicitly grants `cap_add: [SYS_ADMIN]` to certain execution environments. Be extremely careful when adding new packages; always prefer `pnpm` and frozen lockfiles to maintain cache layer integrity.

## 3. SSE over WebSockets
**Observation:** The system previously relied on long-polling. In v0.9.1, we transitioned to Server-Sent Events (SSE) via `/api/events/stream` and the `useEventStream` React hook. 
**Rule:** Do not re-introduce polling intervals (`setInterval`) in React components. Always subscribe to the global SSE feed for telemetric UI updates (e.g., budget remaining, log actions).

## 4. Submodules Are The Core
**Observation:** Standard monorepo structures rely on folders. This project relies entirely on Git Submodules in `external/` (spanning 10 discrete repos). 
**Rule:** Modifying MCP server code requires checking out that submodule's branch, committing there, and then moving to the root directory to commit the submodule pointer bump. We use a PowerShell script (`scripts/sync-submodules.ps1`) to handle mass synchronization.
