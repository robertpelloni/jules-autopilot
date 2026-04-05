# Development TODOs (v1.0.0 -> v1.1.0)

This document tracks granular bugs, missing features, and technical debt. For epic-level milestones, see `ROADMAP.md`.

## Immediate Actions
- [x] **Submodule Dashboard Live Integration:** `SubmoduleList` now uses `useSWR` against `/api/system/submodules` with 30s refresh and manual revalidation.
- [x] **Daemon API Discovery:** Formally established `/api/manifest` for node capability discovery.
- [x] **SSE/WebSocket Log Streaming:** Injected `useDaemonEvent('log_added')` into the session activity view and surfaced a live Keeper feed for session/global daemon events without manual refresh.
- [ ] **Session Event Timeline Enrichment:** Optionally render richer structured cards for debate/escalation/recovery events beyond the current Keeper feed strip.
- [x] **Tooling Stabilization:** Added a working ESLint v9 flat config and aligned the Jest harness with the current Vite/Bun + shared-package runtime assumptions.
- [x] **Lint Coverage Expansion:** Extended the lint command to cover `src/`, `components/`, `lib/`, and `server/` with a staged warning-first rollout.
- [x] **Lint Warning Burn-Down:** Completed two warning burn-down passes and brought the expanded lint surface to zero warnings.
- [ ] **Lint Strictness Ratchet:** Revisit warning-first rule downgrades (`no-explicit-any`, `no-unused-vars`, `no-empty`) and progressively tighten them once the team is ready for stricter enforcement. The actionable backlog is cleared; next step is policy tightening rather than cleanup.
- [x] **Borg Collective UI:** Implemented the "Collective Signals" feed in the Fleet tab to visualize incoming Borg signals.

## Technical Debt & Refactoring
- [x] **Auth Protocol Enforcement:** Locked down Jules Portal `AQ.A` tokens to use `x-goog-api-key` and strictly delete `Authorization` headers to prevent gateway blocks.
- [ ] **Prisma Connection Pooling:** Evaluate `connection_limit` for high-concurrency swarm operations in the Docker environment.
- [x] **Cross-Session Memory Storage:** Implemented the `MemoryChunk` model for persistent, semantic history tracking.
- [ ] **Vector Search Optimization:** Transition to a dedicated vector extension if the RAG index exceeds 50,000 chunks.

## Intelligence & Autonomy
- [x] **Autonomous Self-Healing:** Autopilot now detects `FAILED` sessions and enqueues recovery plans.
- [x] **Council Debate Engine:** High-risk plans now trigger background debates between persona models before approval.
- [x] **Historical Retrieval:** RAG queries now pull from both the current codebase and successful past session outcomes.
