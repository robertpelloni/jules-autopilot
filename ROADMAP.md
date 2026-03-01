# Project Roadmap

This roadmap outlines the major structural plans and strategic milestones for the Jules Autopilot Orchestrator. 
For granular tasks and immediate bug fixes, see `TODO.md` and `task.md`.

## Milestone: v0.9 (Current) — "Enterprise Foundations"
* [x] **Agent Routing & Telemetry:** Dynamic Provider routing (OpenAI vs Anthropic) based on cost and quota caps.
* [x] **Submodule Architecture:** Consolidation of 10 external plugins and MCP tools (Orchestrators, CLI, GitHub Actions).
* [x] **UI Polish:** Granular plugin signature tracking, live budget dashboards, SSE real-time push events.
* [x] **Docker Portability:** Production-hardened containerization with Vercel/Firebase fallback support.

## Milestone: v1.0 — "The Swarm"
* [x] **Distributed Orchestration:** Migration from standalone Node instances to native distributed Redis queues (BullMQ/Kafka).
* [x] **RAG Context Mesh:** Deep semantic search vector stores embedded natively to provide instantaneous codebase familiarity to fresh agents. *(See `RAG_ARCHITECTURE.md` for v1.1.0 implementation path)*
* [x] **IDE Integration:** Official VS Code and JetBrains extension bridges allowing the orchestration core to control a developer's local IDE natively.

## Milestone: v1.5 — "Shadow Pilot"
* [x] **Background Anomaly Detection:** Agents silently monitoring `git diffs` background tasks, fixing failing CI pipelines before human review.
* [x] **WebAssembly Plugin Isolation:** Absolute zero-trust security architecture enforcing memory ceilings on external MCP tool capabilities locally.

## Milestone: v2.0 — "Autonomous Fleet"
* [x] **Multi-Agent Collaboration:** Orchestrate parallel agent swarms working on decomposed sub-tasks with shared context via the RAG mesh and real-time coordination events.
* [x] **Plugin Marketplace:** Browseable registry of community Wasm plugins with install-from-URL, version management, and signature verification in the dashboard UI.
* [x] **Predictive Cost Optimizer:** Machine learning model trained on provider telemetry to predict optimal routing decisions, token budgets, and session timing for minimum cost per task.

## Milestone: v3.0 — "Neural Autonomy"
* [x] **Observability & Health Checks:** Prometheus-compatible `/metrics` endpoint, structured health checks for daemon/Redis/DB, and a live `/dashboard/health` status page.
* [x] **Self-Healing Circuit Breakers:** Provider-level circuit breakers that automatically reroute to fallback models when error rates spike, with configurable thresholds and recovery windows.
* [x] **Multi-Tenant API Keys:** Scoped API key generation for team members with rate limiting, usage quotas, and per-key cost attribution in the cost optimizer.

## Milestone: v4.0 — "Cognitive Core"
* [x] **Audit Trail & Compliance Logging:** Immutable, append-only audit log of every orchestrator action with structured metadata, searchable via API and dashboard.
* [x] **Session Replay & Time Travel:** Record full session activity timelines and replay them step-by-step in the dashboard for debugging and review.
* [x] **Scheduled Automation Engine:** Cron-based task scheduler that launches sessions, swarms, or CI checks on configurable recurring schedules with timezone support.

## Milestone: v5.0 — "Sovereign Intelligence"
* [x] **Webhook Event Router:** Configurable inbound webhook router that maps external service events (Slack, Linear, Jira) to orchestrator actions with JSON path matching rules.
* [x] **Session Templates & Presets:** Reusable session configuration templates with pre-filled prompts, repos, and settings — launchable from the dashboard with one click.
* [x] **Notification Center:** Unified notification hub aggregating alerts from CI fixes, swarm completions, circuit breaker trips, and scheduled job results with read/dismiss state.

## Milestone: v6.0 — "The Meta-Cognitive Mesh"
* [x] **Agent Archetypes & Personas:** Specialized agent personas (Code Reviewer, Architect, Security Analyst) with custom system prompts, temperature settings, and tool access masks.
* [x] **Multi-Agent Debate Engine:** Capability for two different AI personas to debate implementation details and reach consensus before critical operations, with UI playback.
* [x] **Meta-MCP Federation Provider:** Connect orchestrator to dedicated upstream MCP servers (e.g., SQL MCP, Kali Linux MCP) on the network for extended capabilities.

## Milestone: v7.0 — "The Economic Engine"
* [x] **Cost & Telemetry Optimizer:** 30-day tracking of LLM provider usage, token telemetry, latency tracking, and autonomous intelligent routing recommendations.
* [x] **Plugin Marketplace:** Ecosystem for downloading, updating, and managing WebAssembly (.wasm) extensions and MCP plugins created by the community.

## Milestone: v8.0 — "The Guardian Layer"
* [x] **Policy Engine:** Override rules for Model routing (e.g. force GPT-4o for Code Review, but force Gemini Flash for Fast Chat if budget is low).
* [x] **Live Telemetry Stream:** Real-time Server-Sent Events (SSE) feed emitting cluster heartbeats, daemon availability, and cost metrics to connected clients.

## Milestone: v9.0 — "The Persistent Mind"
* [x] **Provider Configuration Persistence:** Prisma-backed `ProviderConfig` model and API to persist cloud provider API keys, priorities, and concurrency settings server-side with workspace scoping.
* [x] **Memory Dashboard:** Interactive `/dashboard/memory` page for browsing, previewing, and managing compacted session memory snapshots.

## Milestone: v10.0 — "The Command Center"
* [x] **Analytics Dashboard:** Comprehensive `/dashboard/analytics` page with session stats, timeline charts, repo usage, LLM cost breakdown, and keeper activity metrics.
* [x] **Settings Hub:** Unified `/dashboard/settings` page combining keeper configuration, budget status visualization, and provider management.

## Milestone: v11.0 — "The Operator"
* [x] **Workspace Management API:** RESTful workspace CRUD (`/api/workspaces`) with Zod validation, slug uniqueness, and automatic owner membership creation.
* [x] **Code Review Dashboard:** Interactive `/dashboard/reviews` page with multi-provider AI code review (OpenAI/Anthropic/Gemini), review type selection (standard/security/performance/architecture), and result display with issue highlighting.

## Milestone: v12.0 — "The Architect"
* [x] **Keeper Logs Dashboard:** Filterable `/dashboard/logs` page with type-based icons, stats bar, session ID display, and real-time refresh.
* [x] **Workspace Switcher:** Membership-validated `/api/workspaces/switch` endpoint allowing users to change active workspace context with role verification.

## Milestone: v13.0 — "The Pipeline"
* [x] **CI Runs Dashboard:** Interactive `/dashboard/ci` page with stats cards (total/passed/failed/success rate), filterable run list, conclusion-based icons, and commit SHA display, backed by a new `/api/ci/runs` API.
* [x] **Data Export API:** Workspace data export (`/api/export`) supporting selective table export (debates, apiKeys, auditLogs, routingPolicies, templates, storedDebates, providerUsageLogs) with configurable limits and JSON download headers.

## Milestone: v14.0 — "The Forge"
* [x] **Installed Plugins Dashboard:** Interactive `/dashboard/plugins` page showing installed plugins with status, version, description, install date, and config indicators, backed by a new `/api/plugins/installed` API.
* [x] **Workspace Members API:** Full member management (`/api/workspaces/members`) with GET for listing members with user details and POST for email-based invitations with Zod validation and role assignment.

## Milestone: v15.0 — "The Hive"
* [x] **Swarm Orchestration Dashboard:** Interactive `/dashboard/swarms` page with swarm creation form, expandable task decomposition cards, status tracking (pending/running/completed/failed), and agent assignment display.
* [x] **Scheduled Jobs Dashboard:** Tabular `/dashboard/jobs` page showing cron expressions, timezone, job type, active/paused status, and next run time, consuming the existing `/api/schedules` CRUD API.

## Milestone: v16.0 — "The Lens"
* [x] **Session Replay Dashboard:** Timeline-based `/dashboard/snapshots` page with session ID search, actor icons (user/assistant/system), event type badges, sequence numbers, and paginated browsing, backed by a new `/api/snapshots` API.
* [x] **System Health Dashboard:** Auto-refreshing `/dashboard/system` page showing database/daemon service status, uptime, and platform-wide metrics (sessions, swarms, plugins, active jobs).
