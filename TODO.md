# Development TODOs (v1.0.0 -> v1.1.0)

This document tracks granular bugs, missing features, and technical debt. For epic-level milestones, see `ROADMAP.md`.

## Immediate Actions
- [x] **Submodule Dashboard Live Integration:** `SubmoduleList` now uses `useSWR` against `/api/system/submodules` with 30s refresh and manual revalidation.
- [x] **Daemon API Discovery:** Formally established `/api/manifest` for node capability discovery.
- [x] **SSE/WebSocket Log Streaming:** Injected `useDaemonEvent('log_added')` into the session activity view and surfaced a live Keeper feed for session/global daemon events without manual refresh.
- [ ] **Session Event Timeline Enrichment:** Optionally render richer structured cards for debate/escalation/recovery events beyond the current Keeper feed strip.
- [x] **Go Backend Parity Pass #2:** Ported the highest-value queue intelligence path (`handleCheckSession`) plus Go-side event/log bridging and real session actions so the Go backend can nudge sessions, enqueue memory sync, and conservatively auto-approve low-risk plans.
- [x] **Go Backend Parity Pass #3:** Ported `handleIndexCodebase` so Go can now walk the repo, chunk source files, request embeddings, and upsert `CodeChunk` rows without Bun.
- [x] **Go Backend Parity Pass #4:** Ported `handleCheckIssues` plus Go-side issue fetching/session spawning support so the Go backend can now discover GitHub work and open Jules sessions autonomously.
- [x] **Go Backend Parity Pass #5:** Ported provider-backed council debate/review into Go, including supervisor-provider LLM calls, debate summaries, risk rescoring, and approval/rejection feedback back into the Jules session.
- [x] **Go Backend Parity Pass #6:** Ported Go-side semantic query / RAG retrieval, added `/api/rag/query`, and wired retrieval-backed local context into Go inactivity nudges.
- [x] **Go Backend Parity Pass #7:** Added explicit Go indexing/issue lifecycle events, taught the frontend websocket layer about them, and expanded Keeper feed metadata rendering for Go-originated automation details.
- [x] **Go Backend Parity Pass #8:** Added Go-side failed-session recovery lifecycle parity plus `PATCH /api/sessions/:id` support so the Go backend can recover failed sessions and cover a broader session-control surface.
- [x] **Go Backend Parity Pass #9:** Added Go-native direct session fetch, session activity fetch, and RAG reindex routes, reducing the remaining practical route/control gap versus the Bun daemon.
- [x] **Go Backend Parity Pass #10:** Ported Go filesystem utility endpoints (`/api/fs/list`, `/api/fs/read`) so repository-context gathering has Go-native support in addition to the previously ported session/memory/control surface.
- [x] **Go Backend Parity Pass #11:** Ported Go template CRUD so another actively used non-core frontend surface now has Go-native API support.
- [x] **Go Backend Parity Pass #12:** Ported Go-native `/api/review` and `/api/local/review` support so another actively used non-core product workflow now has Go API coverage.
- [ ] **Go Backend Parity Pass #13:** Refine Go-side recovery state tracking to avoid redundant guidance, then audit the remaining non-core product surfaces (import/export) for whether they should also migrate into Go.
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
