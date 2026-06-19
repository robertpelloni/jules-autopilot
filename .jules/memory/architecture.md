# Jules Autopilot: Comprehensive Architecture, Patterns, and Decisions Summary

This document serves as the persistent memory of the Jules Autopilot project, capturing its technical evolution, architectural standards, and core design decisions to ensure continuity across autonomous sessions.

## 1. High-Level Architecture
Jules Autopilot is an **Omni-Workspace monorepo** designed as a centralized orchestration and command center for an expansive ecosystem of independent submodules (including `itgmania`, `borg`, `aios`, and various specialized rhythm game engines).

### Technology Stack
- **Backend (Primary Runtime)**: **Go (Fiber)**. The system pivoted from a Bun/Hono foundation to Go to achieve deterministic performance, lower memory usage, and superior reliability for high-concurrency "fleet" orchestration. It handles REST APIs, WebSocket broadcasting, and task queue processing in a single efficient binary.
- **Frontend**: **React 19 + Vite + TailwindCSS v4**. A pure Single Page Application (SPA) focusing on real-time visibility, observability, and zero SSR overhead.
- **Database**: **SQLite with GORM**. Uses Write-Ahead Logging (WAL) and strict connection pooling (`MaxOpenConns: 1`) to safely manage concurrent operations in a single-writer environment.
- **Package Management**: **pnpm workspaces**. Orchestrates `apps/cli` (Ink-based TUI), `packages/shared` (shared types and LLM provider logic), and the root UI.

## 2. Core Operational Patterns
Autonomy is driven by several continuous background loops:
- **Daemon Service**: Monitors active Jules sessions, reactivates stalled agents via context-aware "nudges," and autonomously evaluates and approves low-risk implementation plans.
- **Shadow Pilot**: A specialized regression and vulnerability monitor. It performs dependency audits (`govulncheck`, `npm audit`) and real-time Git diff tracking to flag large deletions or code churn (>100 lines deleted with minimal insertions).
- **CI Monitor**: Watches for pipeline failures (merge conflicts, WIP commits, syntax errors) across all tracked repositories and enqueues specialized `ci_auto_fix` recovery sessions.
- **Asynchronous Task Queue**: Uses a goroutine-based semaphore pool to execute heavy workloads (RAG indexing, embedding generation, issue evaluation) without blocking the primary API.
- **Dual-Layer RAG**: Performs semantic search across both current source code (`CodeChunk`) and historical session successes (`MemoryChunk`) to provide agents with massive architectural context.

## 3. Key Technical Decisions & Lessons Learned
- **Go-First Pivot**: The move to Go was a strategic decision to stabilize the orchestrator for high-scale "fleet" scenarios, moving away from the more experimental Bun-based server logic.
- **Versioning Protocol**: The project enforces a "Single Source of Truth" strategy. The root `VERSION` file is master; all workspace `package.json` files must be strictly synchronized to this version during builds to prevent environment drift.
- **Lockfile Hygiene (CI Resilience)**: GitHub Actions CI requires a "frozen lockfile." Any change to `package.json` (version bumps or overrides) **MUST** be followed by an exhaustive `pnpm install` and a commit of the resulting `pnpm-lock.yaml`.
- **Override Consolidation**: pnpm overrides should be consolidated in the root `package.json` (under the `pnpm.overrides` or `pnpm.overrides` field depending on pnpm version) rather than `pnpm-workspace.yaml` to ensure consistent dependency resolution and avoid `minimatch` related build/lint errors.
- **UI Data Fetching**: Extensive use of `useSWR` for real-time dashboard components (e.g., Submodule List, Shadow Pilot Panel) enables seamless background refreshing and manual revalidation triggers.

## 4. Documentation & Governance
The project adheres to strict documentation governance, requiring updates to the following files after every major implementation:
- **VISION.md**: Long-term goals and sovereign intelligence foundations.
- **ROADMAP.md**: Structural milestones (e.g., v1.5 Shadow Pilot, v2.0 Autonomous Fleet).
- **TODO.md**: Granular technical debt and immediate "warning burn-down" tracking.
- **CHANGELOG.md**: Detailed history of adjustments, explicitly referencing build versions.
- **HANDOFF.md**: Comprehensive session summaries for successor models.

## 5. Integration Traits
- **Jules API**: Authenticates using `x-goog-api-key` for `AQ.A` tokens; strictly deletes the `Authorization` header to prevent gateway conflicts and timeouts.
- **Borg Readiness**: Fully compatible with the Borg meta-orchestrator via the `/api/manifest` discovery endpoint and `/api/webhooks/borg` signal gateway.
- **Submodule Intelligence**: Real-time git status and commit tracking for the entire monorepo ecosystem (including `itgmania`) is unified in the operator settings dashboard.

---
*This memory is recorded to maintain total autonomy and ensure a self-healing, self-documenting software ecosystem.*