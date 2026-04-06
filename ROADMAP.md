# Project Roadmap

This roadmap outlines the major structural plans and strategic milestones for the Jules Autopilot Orchestrator. 
For granular tasks and immediate bug fixes, see `TODO.md`.

## Milestone: v1.0.0 (Current) — "Deep Autonomous Node"
* [x] **Cross-Session Historical Intelligence**: The Autopilot now monitors for COMPLETED sessions, vectorizes the final result, and saves it into the `MemoryChunk` table for dual-layer RAG.
* [x] **Borg Discovery Handshake**: Added `GET /api/manifest` endpoint, broadcasting node capabilities and version for Borg assimilation.
* [x] **Session Replay Engine**: Added `GET /api/sessions/:id/replay` to provide a high-definition timeline of a session's entire history, optimized for Borg.
* [x] **Interactive Session Replay**: Integrated a `SessionReplayDialog` component accessible via a History icon on each session card.
* [x] **Global Fleet Heartbeat**: Added a "Fleet Pulse" section to the sidebar with a real-time active job counter and a pulsing brain icon.
* [x] **Autonomous Self-Healing**: The Autopilot actively monitors for the `FAILED` state, uses the Council Supervisor to analyze the error context, and autonomously messages Jules with a recovery plan.
* [x] **Visual Cognitive Status**: Session cards feature real-time "HEALING" and "EVALUATING" badges.
* [x] **Borg Fleet Summary API**: Implemented `GET /api/fleet/summary` for providing the Borg meta-orchestrator with a high-signal JSON payload of the fleet's state.
* [x] **Autonomous Issue Conversion**: Background daemon fetches open GitHub issues, evaluates if they are "Self-Healable", and autonomously spawns new Jules sessions.
* [x] **Continuous RAG Indexing**: Periodic background job chunks and embeds the repository into SQLite for "Long-Term Memory".
* [x] **Autonomous Multi-Agent Debates**: High-risk implementation plans trigger a background debate between a Security Architect and a Senior Engineer before auto-approval.
* [x] **Queue Telemetry**: Added real-time counts of pending and processing jobs to `/api/daemon/status`.
* [x] **Version Uniformity Hardening**: Synced the canonical runtime version across the daemon manifest, header badge, CLI settings screen, shared packages, and compatibility version files.
* [x] **Developer Tooling Recovery**: Restored a working Jest harness and added an ESLint v9 flat configuration so core validation commands are operational again.
* [x] **Lint Surface Re-Expansion**: Reintroduced `components/`, `lib/`, and `server/` to the primary lint workflow using a warning-first rollout for legacy hotspots.
* [x] **Warning Backlog Reduction Pass #1**: Cut the expanded lint backlog in half by removing low-risk unused imports, unused props, and unused helpers across major app surfaces.
* [x] **Warning Backlog Reduction Pass #2**: Eliminated the remaining expanded-lint warnings by tightening types, stabilizing hook dependencies, and calibrating non-actionable refresh warnings.
* [x] **Warning Backlog Reduction Pass #3**: Replaced residual ad-hoc casts with typed webhook, websocket, queue, and client error payloads while keeping the expanded validation surface clean.
* [x] **Live Keeper Feed in Session View**: Streamed daemon `log_added` events directly into the session activity view so background Keeper actions appear without manual refresh.
* [x] **Keeper Event Detail Streaming**: Preserved session scoping and event metadata for nudges/approvals so the active session view can show richer operator context inline.
* [x] **Council Debate Lifecycle Streaming**: Added dedicated escalation/resolution daemon events so the active session feed can surface debate state changes, risk scores, and outcomes without refresh.
* [x] **Go Backend Parity Pass #2**: Ported the Go `check_session` automation path, live daemon queueing, realtime Keeper log/event bridging, and practical session actions (`approvePlan`, real nudge route) so more autonomous control-loop behavior can run outside the Bun daemon.
* [x] **Go Backend Parity Pass #3**: Ported Go-side `index_codebase` traversal and embedding ingestion so repository chunk indexing no longer depends exclusively on the TypeScript daemon.
* [x] **Go Backend Parity Pass #4**: Ported Go-side GitHub issue evaluation and autonomous session spawning so issue-driven work discovery no longer depends exclusively on the TypeScript queue path.
* [x] **Go Backend Parity Pass #5**: Ported provider-backed council debate/review into the Go session-approval path so risky plans can be debated, summarized, rescored, and approved/rejected without falling back immediately to the Bun daemon.
* [x] **Go Backend Parity Pass #6**: Ported semantic query / RAG retrieval into the Go backend, including combined code/history similarity search, a Go `/api/rag/query` route, and RAG-assisted session nudges.
* [x] **Go Backend Parity Pass #7**: Broadened Go lifecycle/detail parity with explicit indexing/issue daemon events, frontend websocket support, and richer Keeper feed metadata for Go-originated automation flows.
* [x] **Go Backend Parity Pass #8**: Added Go-side failed-session recovery/self-healing plus session patch/update support, with explicit recovery lifecycle events surfaced to the operator UI.
* [x] **Go Backend Parity Pass #9**: Closed several remaining practical Go session/API route gaps by adding direct session fetch, activity fetch, and Go-native RAG reindex endpoints.
* [x] **Go Backend Parity Pass #10**: Ported Go filesystem utility endpoints used for repository-context gathering so the client no longer depends on Bun-only `/api/fs/*` routes for that workflow.
* [x] **Go Backend Parity Pass #11**: Ported Go template CRUD routes so the frontend can manage session templates through the Go backend instead of depending on Bun-only template endpoints.
* [x] **Go Backend Parity Pass #12**: Ported Go-native review endpoints so direct code-review workflows can run through the Go backend instead of depending on Bun-only review routing.
* [x] **Go Backend Parity Pass #13**: Added Go-native import/export support and refined failed-session recovery dedupe so the settings portability flow and recovery edge cases rely less on Bun-only behavior.

## Milestone: v1.5 — "Shadow Pilot"
* [ ] **Background Anomaly Detection:** Agents silently monitoring `git diffs` background tasks, fixing failing CI pipelines before human review.
* [ ] **WebAssembly Plugin Isolation:** Absolute zero-trust security architecture enforcing memory ceilings on external MCP tool capabilities locally.

## Milestone: v2.0 — "Autonomous Fleet"
* [ ] **Multi-Agent Collaboration:** Orchestrate parallel agent swarms working on decomposed sub-tasks with shared context via the RAG mesh and real-time coordination events.
* [ ] **Plugin Marketplace:** Browseable registry of community Wasm plugins with install-from-URL, version management, and signature verification in the dashboard UI.
* [ ] **Predictive Cost Optimizer:** Machine learning model trained on provider telemetry to predict optimal routing decisions, token budgets, and session timing for minimum cost per task.

## Milestone: v3.0 — "Neural Autonomy"
* [ ] **Observability & Health Checks:** Prometheus-compatible `/metrics` endpoint, structured health checks for daemon/Redis/DB, and a live `/dashboard/health` status page.
* [ ] **Self-Healing Circuit Breakers:** Provider-level circuit breakers that automatically reroute to fallback models when error rates spike, with configurable thresholds and recovery windows.
* [ ] **Multi-Tenant API Keys:** Scoped API key generation for team members with rate limiting, usage quotas, and per-key cost attribution in the cost optimizer.

## Milestone: v4.0 — "Cognitive Core"
* [x] **Audit Trail & Compliance Logging:** Immutable, append-only audit log of every orchestrator action with structured metadata, searchable via API and dashboard.
* [x] **Session Replay & Time Travel:** Record full session activity timelines and replay them step-by-step in the dashboard for debugging and review.
* [ ] **Scheduled Automation Engine:** Cron-based task scheduler that launches sessions, swarms, or CI checks on configurable recurring schedules with timezone support.

## Milestone: v5.0 — "Sovereign Intelligence"
* [x] **Webhook Event Router:** Configurable inbound webhook router that maps external service events (Slack, Linear, Jira, Borg) to orchestrator actions.
* [x] **Session Templates & Presets:** Reusable session configuration templates with pre-filled prompts, repos, and settings — launchable from the dashboard with one click.
* [ ] **Notification Center:** Unified notification hub aggregating alerts from CI fixes, swarm completions, circuit breaker trips, and scheduled job results with read/dismiss state.
