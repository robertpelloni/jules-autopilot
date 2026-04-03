# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-25

### Added
- **Full Borg Assimilation (Release)**: Completed the journey to a "Deep Autonomous Node". The node is fully self-aware, self-healing, and self-learning.
- **Live Submodule UI Hook**: Integrated `useSWR` into the Submodule Dashboard. The UI now auto-refreshes architectural data every 30s using native Git SHAs from the daemon.
- **Borg Discovery Handshake**: Added `GET /api/manifest` and `GET /api/fleet/summary` for collective node auditing.
- **Session Replay Engine**: Structured JSON audit trails and a high-fidelity visual timeline dialog.
- **Collective Signal Gateway**: Real-time webhook processing and WebSocket broadcasting for Borg collective signals.
- **Cross-Session Memory**: Semantic RAG indexing of successful task outcomes across the entire fleet.
- **Autonomous Self-Healing**: Automated failure detection and recovery plan generation via the Council Supervisor.

## [1.0.0-rc.1] - 2026-03-25

### Added
- **Full Borg Assimilation Readiness**: Completely documented the integration protocols, finalized the handoff state, and brought the fleet to "Deep Autonomous Node" status.

## [0.9.14] - 2026-03-25

### Fixed
- **Vercel Deploy Conflict**: Solved the "No entrypoint found" error by introducing `.vercelignore` to cloak the backend daemon from Vercel's auto-detector, ensuring a clean Vite SPA deployment.

## [0.9.13] - 2026-03-25

### Added
- **Borg Signal Dashboard**: Added the "Collective Signals" real-time feed to the Fleet tab, visualizing incoming webhooks.
- **WebSocket Gateway**: Overhauled the WebSocket protocol to broadcast `borg_signal_received` events globally for instant UI updates.

## [0.9.12] - 2026-03-25

### Added
- **Live Submodule Intelligence**: Created `GET /api/system/submodules` endpoint to execute `git submodule status` natively.
- **Interactive Submodule Dashboard**: Added a "Submodules" tab to the Core Configuration dialog to track real-time commit hashes and sync states across the 10+ integrated repos.

## [0.9.11] - 2026-03-25

### Fixed
- **Vercel Routing**: Simplified `vercel.json` to a standard SPA rewrite format, removing local proxy loops that conflicted with production builds.

## [0.9.10] - 2026-03-25

### Added
- **Cloud-Ready Deployment Architecture**: Introduced `build:vercel` scripts and environment variable overrides (`VITE_JULES_API_BASE_URL`) to allow seamless deployment of the frontend to Vercel while the backend daemon runs on an independent cloud server.
- **DEPLOY.md**: Created comprehensive deployment documentation for local, Docker, and Vercel environments.

## [0.9.9] - 2026-03-25

### Added
- **Complete Re-evaluation and Analysis**: Documentation synced across `UNIVERSAL_LLM_INSTRUCTIONS.md` and `IDEAS.md` for continuous feature progression.

## [0.9.8] - 2026-03-25

### Added
- **Cross-Session Historical Intelligence**: The Autopilot now monitors for COMPLETED sessions, vectorizes the final result, and saves it into the `MemoryChunk` table.
- **Dual-Layer RAG**: The RAG engine (`server/rag.ts`) now performs parallel semantic searches across both Source Code and Session History.
- **Context Labeling**: Autopilot nudges now specify if context comes from `[CURRENT CODEBASE]` or `[HISTORICAL SUCCESS]`.

## [0.9.7] - 2026-03-25

### Added
- **Borg Discovery Handshake**: Added `GET /api/manifest` endpoint, broadcasting node capabilities and version for Borg assimilation.
- **Session Replay Engine**: Added `GET /api/sessions/:id/replay` to provide a high-definition timeline of a session's entire history, optimized for Borg.
- **Interactive Session Replay**: Integrated a `SessionReplayDialog` component accessible via a History icon on each session card.
- **Global Fleet Heartbeat**: Added a "Fleet Pulse" section to the sidebar with a real-time active job counter and a pulsing brain icon.

## [0.9.6] - 2026-03-25

### Added
- **Autonomous Self-Healing**: The Autopilot actively monitors for the `FAILED` state, uses the Council Supervisor to analyze the error context, and autonomously messages Jules with a recovery plan.
- **Visual Cognitive Status**: Session cards feature real-time "HEALING" and "EVALUATING" badges.
- **Borg Fleet Summary API**: Implemented `GET /api/fleet/summary` for providing the Borg meta-orchestrator with a high-signal JSON payload of the fleet's state.

## [0.9.5] - 2026-03-25

### Added
- **Autonomous Issue Conversion**: Background daemon fetches open GitHub issues, evaluates if they are "Self-Healable", and autonomously spawns new Jules sessions.
- **Continuous RAG Indexing**: Periodic background job chunks and embeds the repository into SQLite for "Long-Term Memory".
- **Autonomous Multi-Agent Debates**: High-risk implementation plans trigger a background debate between a Security Architect and a Senior Engineer before auto-approval.
- **Queue Telemetry**: Added real-time counts of pending and processing jobs to `/api/daemon/status`.

## [0.9.4] - 2026-03-24

### Added
- **Autonomous Plan Approval**: Integrated the Council Supervisor into the background daemon. The Autopilot now intercepts Jules sessions in `AWAITING_PLAN_APPROVAL`, evaluates the risk of the proposed plan using an LLM (`evaluatePlanRisk`), and autonomously approves plans that score below the risk threshold (<40).
- **Cognitive Nudging**: Upgraded the Autopilot's background polling to use context-aware generative nudging (`decideNextAction`). Nudges are now contextually relevant to the specific activities the agent was performing before stalling.
- **Borg Integration Protocol**: Created `docs/BORG_INTEGRATION.md` to establish the API and daemon contracts for assimilation into the Borg ecosystem.

### Changed
- **Shared Intelligence Base**: Fully centralized the AI orchestration and evaluation logic into the `@jules/shared` package so it can be natively invoked by the SQLite background queue.

## [0.9.3] - 2026-03-24

### Removed
- **Analytics System**: Completely removed the `AnalyticsDashboard` component and `/api/analytics` endpoint to simplify the workspace.
- **Side Logs**: Deleted the vertical logs panel and `SessionKeeper` UI components.
- **System Dashboard**: Removed the internal system metrics and submodule status pages.

### Changed
- **UI Refactor**: Transitioned chat history (`ActivityFeed`, `ActivityItem`, `ActivityGroup`) to a fully theme-aware architecture using CSS variables instead of hardcoded dark-mode values.
- **Version Uniformity**: Synchronized all version strings across `package.json`, `lib/version.ts`, `VERSION`, `VERSION.md`, `next.config.ts`, `docs/ARCHITECTURE.md`, and UI fallbacks to `0.9.1`.

### Fixed
- **Type Safety**: Resolved several linting warnings and fixed syntax errors in `AppLayout`.

## [0.9.0] - 2026-02-27

### Added
- **RAG Context Architecture**: Designed the impending `sqlite-vss` integration in `RAG_ARCHITECTURE.md` to offer instantaneous codebase familiarity natively to the orchestrator agents via the `query_codebase` MCP tool.
- **Enterprise Foundations**: Consolidated systems, audited all plugins, fully hydrated submodule metrics, and achieved complete project stability.

### Changed
- **Database Scalability**: Enforced `connection_limit=1` and `socket_timeout=10` on production SQLite database interactions within `lib/prisma.ts` to neutralize "database is locked" concurrency conflicts.
- **Terminal System Deprecation**: Ripped out the experimental web-based "Integrated Terminal" (including `xterm.js` dependencies, `components/terminal-panel.tsx`, and the `terminal-stream`) to reduce deployment payload and enforce cleaner REST interfaces.

### Fixed
- **Authentication**: Patched an unhanded `ClientFetchError` inside the Next.js `authjs` configuration causing 500 crashes by successfully provisioning and generating `.env` secrets.

## [0.8.1] - 2026-02-27

### Added
- **Global Documentation Overhaul**: Rebuilt `VISION.md`, `ROADMAP.md`, `TODO.md`, and `MEMORY.md`. 
- **Universal LLM Instructions**: Consolidated all agent prompts (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `GPT.md`) to source from a singular `UNIVERSAL_LLM_INSTRUCTIONS.md`.
- **Submodule Deep Scan Analysis**: Automatically generated structural `IDEAS.md` documents exploring visionary features for all 10 independent Git submodules.
- **Git Submodule Sync Automation**: Introduced `scripts/sync-submodules.ps1` to automatically checkout, pull, and cleanly merge feature branches across all 10 external submodules.

## [0.9.1] - 2026-02-26

### Added
- **Routing Simulation Dashboard**: New `/dashboard/routing` page with interactive task-type selector, token count presets (Light/Medium/Heavy/Mega), real-time cost estimation, budget impact visualization with progress bar, and health status indicators — all backed by the existing `/api/routing/simulate` endpoint.
- **Plugin Signature Badges**: Ed25519 cryptographic verification status now displayed on each plugin card in the marketplace (✓ Verified / ⚠ Unsigned).

### Fixed
- **CRITICAL: Missing Auth on `/api/review`**: Added session authentication gate — previously any unauthenticated user could trigger LLM calls and incur costs.
- **Auth Ordering in `/api/debate`**: Moved authentication check before expensive participant enrichment loop.
- **Consistent Error Handling**: Replaced raw `console.error` catch blocks in `debate/route.ts`, `debate/history/route.ts` with structured `handleInternalError` responses.
- **Silent Error Swallowing**: `settings/keeper` GET now logs errors before returning defaults.
- **Type Safety**: `routing/simulate/route.ts` `catch (err: any)` → `catch (err: unknown)` with proper `instanceof Error` check.
- **Dead Code Removal**: Removed deprecated `setSession()`/`clearSession()` stubs from `lib/session.ts`.
- **Legacy Auth Deprecation**: `auth/login` and `auth/logout` routes now return `410 Gone` pointing to NextAuth flow.

### Changed
- **Test Suite**: 12/12 suites, 61 tests passing. Updated `review/route.test.ts` assertions for structured error format. Rewrote deprecated auth route tests.

## [0.9.0] - 2026-02-26

### Added
- **Phase 15: Advanced Plugin Ecosystem**: Marketplace ingestion pipeline (`POST /api/plugins/ingest`) with Ed25519 cryptographic signature verification (`lib/crypto/signatures.ts`). Plugin execution sandbox with per-workspace daily quotas and comprehensive `PluginAuditLog` audit trail.
- **Phase 16: Intelligent Provider Routing**: Dynamic LLM provider selection engine (`lib/routing/engine.ts`) supporting task-type-based routing, cost-efficiency fallbacks, and `Workspace.monthlyBudget` enforcement. Routing simulation API (`POST /api/routing/simulate`) for cost previewing. `ProviderTelemetry` model tracking token usage and USD costs. `RoutingPolicy` model for per-workspace routing overrides.
- **New Prisma Models**: `PluginAuditLog`, `ProviderTelemetry`, `RoutingPolicy`. Added `signature`, `publicKey`, `status` to `PluginManifest`. Added `monthlyBudget` and `maxPluginExecutionsPerDay` to `Workspace`.
- **Test Coverage**: 12 test suites, 63 tests passing. Added tests for plugin quota enforcement (429), routing simulation (402 budget exceeded, cost-efficiency fallback), workspace auth boundaries.

### Changed
- **Documentation Overhaul**: Comprehensive rewrite of `LLM_INSTRUCTIONS.md` (v3.0), `VISION.md`, `ROADMAP.md`, `MEMORY.md`, `HANDOFF.md`, `IDEAS.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `GPT.md`, `copilot-instructions.md`. All agent instruction files now reference `LLM_INSTRUCTIONS.md` as the universal hub with model-specific overrides.
- **Roadmap Re-baseline**: All P0–P4 backlog items marked complete. Remaining gaps accurately documented.
- **VERSION Sync**: Synchronized `VERSION.md`, `VERSION`, and `package.json` to `0.9.0`.

## [0.8.9] - 2026-02-22

### Changed
- **System Sync Protocol**: Comprehensive system synchronization and documentation overhaul.
- **Unified Intructions**: Consolidated AI instructions (`CLAUDE.md`, etc.) to reference `LLM_INSTRUCTIONS.md`.
- **Vision and Memory**: Overhauled `VISION.md`, created `MEMORY.md` for coding patterns, and unified `DEPLOY.md`.
- **Roadmap Audit**: Baselined the roadmap and TODO to prioritize the replacement of mock dashboards.
- **Git State**: Synced all git submodules and upstream repositories.

## [0.8.8] - 2026-02-09

### Added
- **Analytics Dashboard**: Implemented real-time statistics fetching for sessions, activity volume, and code churn metrics in `components/analytics-dashboard.tsx`.
- **System Dashboard**: Enhanced `/system/internals` to display detailed submodule status (build number, commit hash, date) and project directory structure.
- **Documentation**: Comprehensive rewrite of `README.md` and `VISION.md`. Refactored agent instructions (`AGENTS.md`, etc.) to reference a single source of truth (`LLM_INSTRUCTIONS.md`).

### Changed
- **Architecture**: Moved core orchestration logic (`lib/orchestration`) to a dedicated workspace package (`@jules/shared`) to resolve Vercel serverless deployment issues.
- **Vercel Support**: Updated `server/index.ts` to detect runtime environments (`Bun` vs `Node.js`) and use the appropriate server adapter (`@hono/node-server`), fixing crashes on Vercel.
- **Build System**: Updated `package.json` scripts to strictly build `@jules/shared` in `postinstall` to ensure dependencies are available for Vercel builds.
- **Cleanup**: Removed legacy code and resolved all known "ERR_MODULE_NOT_FOUND" issues by enforcing explicit `.js` extensions in shared package imports.

## [0.8.7] - 2026-02-04

### Added
- **Multi-Provider Dashboard**: New UI at `/dashboard/providers` to manage sessions across Jules, Devin, Manus, etc.
- **Session Transfers**: Feature to migrate sessions between providers with context preservation.
- **Mock Mode**: Simulation mode for all cloud providers, enabling full UI testing without API keys.
- **Robustness**: Enhanced error handling and fallback mechanisms for API integrations.

## [0.8.6] - 2026-02-04

### Added
- **Unified Documentation**: Created `LLM_INSTRUCTIONS.md` as the single source of truth for all agents.
- **Enhanced System Dashboard**: Updated submodule tracking to include Build Number, Commit Hash, and detailed status.
- **Build Infrastructure**: Migrated CI to `pnpm` and added workspace support for Bun compatibility.
- **Backend Fixes**: Resolved TypeScript errors in the Session Keeper Daemon (`server/`).
- **Deployment**: Hardened Vercel configuration for serverless runtime stability.

### Changed
- **Versioning**: Bumped version to 0.8.6 across `package.json`, `VERSION.md`, and `lib/version.ts`.
- **Documentation**: Consolidated old documentation into `docs/archive/` and updated `README.md`.

## [0.8.5] - 2026-01-09

### Added
- **Multi-Provider Cloud Dev Support:** Unified abstraction layer for managing AI coding sessions across multiple cloud dev providers.
  - **Unified Types** (`types/cloud-dev.ts`): `CloudDevProviderId`, `UnifiedSession`, `UnifiedActivity`, `SessionTransferRequest`
  - **Base Provider** (`lib/cloud-dev/providers/base.ts`): Abstract `BaseCloudDevProvider` class with `ProviderNotImplementedError`
  - **Jules Provider** (`lib/cloud-dev/providers/jules.ts`): Full implementation wrapping existing `JulesClient`
  - **Stub Providers**: Devin, Manus, OpenHands, GitHub Spark, Blocks, Claude Code, Codex (ready for future API integration)
  - **Provider Registry** (`lib/cloud-dev/providers/index.ts`): Factory functions `createProvider()`, `createProviders()`, `getAvailableProviderIds()`
  - **Session Transfer Service** (`lib/cloud-dev/transfer.ts`): `SessionTransferService` for migrating sessions between providers
  - **Zustand Store** (`lib/stores/cloud-dev.ts`): Persistent state management for multi-provider sessions with `useCloudDevStore`
- **Multi-Provider UI Components:**
  - **Provider Settings** (`components/cloud-dev-providers-settings.tsx`): API key management for all providers
  - **Provider Selector** (`components/provider-selector.tsx`): Dropdown for selecting active provider
  - **Settings Dialog**: New "Cloud Dev" tab for provider configuration
  - **New Session Dialog**: Provider selection when creating sessions
  - **Session List**: Provider filter dropdown and provider badges on session items
  - **Session Card**: Optional provider badge display with provider-specific colors/icons
  - **Activity Feed**: Provider badge in session header with color-coded icons
  - **Session Board** (Kanban): Provider filter dropdown and badges in all columns

### Changed
- **Architecture:** Session IDs now use `"{providerId}:{providerSessionId}"` format for cross-provider identification
- **Documentation:** Updated `docs/VISION.md` to reflect multi-provider mission and v0.8.5 status

## [0.8.0] - 2026-01-09

### Added
- **Session Keeper Daemon:** Migrated background monitoring from client-side React polling to a persistent **Bun/Hono backend daemon** (`server/`). Sessions stay monitored even when the browser is closed.
  - New endpoints: `/api/daemon/start`, `/api/daemon/stop`, `/api/daemon/status`
  - New endpoint: `/api/supervisor/clear` for resetting supervisor state
  - Daemon logs written to `KeeperLog` table in SQLite
- **Prisma Schema:** Added `SupervisorState` model for persisting per-session supervisor state (replaces localStorage).

### Changed
- **Architecture:** Session Keeper now runs on `http://localhost:8080` (Bun server) with CORS enabled for frontend communication.
- **Frontend:** `session-keeper-manager.tsx` reduced from 500+ lines to ~65 lines; now polls daemon status every 30s.
- **Store:** `lib/stores/session-keeper.ts` updated to call Bun server API instead of managing local loop.
- **Settings:** "Clear Memory" in settings now calls backend API instead of clearing localStorage.

### Fixed
- **Merge Conflict:** Resolved conflict in `copilot-instructions.md`.

## [0.7.1] - 2026-01-09

### Added
- **Orchestration:** Implemented a **Risk-Scoring Engine** in `supervisor.ts` to evaluate agent plans based on complexity, side effects, and consensus.
- **Observability:** Added **Throughput & Performance Metrics** (Nudges/hr, Token/sec, Risk Approval Rate) to the System Dashboard.
- **Documentation:** Created a **Universal Library & Function Index** (`docs/LIBRARY_INDEX.md`) documenting all 11 submodules and core dependencies.
- **UI:** Enhanced the **Submodule Dashboard** with feature tags, GitHub links, and directory structure explanations.

### Changed
- **Versioning:** Bumped project version to **0.7.1** across `package.json`, `VERSION.md`, and UI components.
- **Activity Feed:** (Previous) Row virtualization implemented for high-scale session histories.

## [0.7.0] - 2026-01-08

### Added
- **Multi-Agent Debate:** Configurable providers (OpenAI, Anthropic, Gemini, Qwen) and models in Debate Dialog.
- **Documentation:** Hierarchical `AGENTS.md` structure (Root, components, lib, external) for better context.
- **Submodules:** Sync and cleanup of external submodules; removed invalid `jules-agent-sdk-python` entry.

### Changed
- **Versioning:** Centralized version number in `VERSION.md`.
- **Git:** Merged upstream feature branches (`palette/api-key-ux`, `ui-mobile-responsive-layout`, `feat/issue-31-kanban-board`).

## [0.6.1] - 2025-12-30

### Fixed
-   **Session List:** Restored missing project details (Source/Repo) in the session list sidebar items.
-   **Broadcast Dialog:** Fixed empty session list in Broadcast Dialog by correctly passing `openSessions`.
-   **Build System:** Resolved Prisma generation file lock issues during build.

## [0.6.0] - 2025-12-29

### Added
-   **Session Keeper:** Fully automated "Auto-Pilot" mode for sessions.
-   **Broadcast:** Initial implementation of global broadcast system.
-   **Submodule Dashboard:** Added `app/submodules.json` generation script.

### Changed
-   **Architecture:** Major refactor of `app/api/jules` to support dynamic proxying.
-   **Dependencies:** Downgraded `@libsql/client` to 0.6.0 for compatibility.

## [0.3.4] - 2025-12-29

### Changed
-   **Submodules**: Updated submodule information.
-   **Documentation**: Updated ROADMAP.md and synchronized LLM instructions.
-   **Versioning**: Bumped version to 0.3.4.

## [0.3.3] - 2025-12-27

### Changed
-   **Submodules**: Updated all submodules to latest versions and merged upstream changes.
-   **System Dashboard**: Enhanced directory structure documentation in `/system`.
-   **Maintenance**: Merged feature branches and performed general repository maintenance.

## [0.3.2] - 2025-12-27

### Added
-   **Tests**:
    -   Added E2E/Integration tests for the System Dashboard (`app/system/page.test.tsx`).
    -   Added comprehensive tests for `ActivityFeed` covering rendering, grouping, messaging, and archived states.
    -   Verified tests for `SessionKeeperManager`.

### Fixed
-   **E2E Testing**: Resolved port conflicts in E2E tests by configuring a dedicated port (3005) and custom startup script.
-   **Code Quality**: Fixed critical linting errors (`react-hooks/set-state-in-effect`) in `AppLayout`, `SettingsDialog`, and `TemplateFormDialog` to prevent cascading re-renders.
-   **Type Safety**: Resolved `any` type usage in `ActivityContent` and `MemoryManager`.

### Performance
-   **Session Rendering**: Optimized `ActivityFeed` by implementing memoized `ActivityItem` and `ActivityGroup` components to prevent unnecessary re-renders in large sessions.

## [0.3.1] - 2025-12-27

### Added
-   **Code Churn Analytics**: New stacked bar chart in the Analytics Dashboard to visualize code additions and deletions over time.
-   **Metrics**: Daily aggregation of code impact stats (additions/deletions) from session activities.

## [0.3.0] - 2025-12-27

### Added
-   **Documentation Overhaul**: Centralized all AI instructions into `LLM_INSTRUCTIONS.md`.
-   **Versioning System**: Implemented strict versioning with `VERSION` file as the single source of truth.
-   **System Dashboard**: New dashboard at `/system` to visualize submodule status and versions.

### Changed
-   **Agent Protocols**: Updated `AGENTS.md`, `GEMINI.md`, and `CLAUDE.md` to reference the master instruction file.
-   **Project Structure**: Standardized documentation and versioning workflows.

## [0.2.9] - 2025-12-27

### Added
-   **Session Health Monitoring**: New system to detect and visualize session health.
    -   **Health Badges**: Visual indicators (Healthy, Stalled, Critical) in Session List and Activity Feed.
    -   **Analytics**: New "Stalled Sessions" metric in the Analytics Dashboard.
    -   **Logic**: Automatic detection of stalled sessions based on inactivity thresholds (5m warning, 30m critical).

### Refactored
-   **App Layout**: Decomposed the monolithic `AppLayout` component into smaller, manageable parts (`AppHeader`, `AppSidebar`, `MainContent`) to improve maintainability and readability.

## [0.2.8] - 2025-12-26

### Added
-   **GitHub Issue Integration**: New feature in "New Session" dialog to fetch and select open issues from the repository. Pre-fills session title and prompt with issue details.
-   **Settings Dialog**: Centralized settings management with tabs for "Integrations" (GitHub Token) and "Supervisor".
-   **Notifications**: Integrated `sonner` for toast notifications across the app.

### Changed
-   **UI**: Replaced the standalone "Supervisor Settings" dialog with the new unified "Settings" dialog.

## [0.2.7] - 2025-12-26

### Added
-   **Template Management**: Enhanced `TemplateFormDialog` with a proper tag input system (using Badges) and auto-renaming logic when cloning system templates.
-   **Terminal Integration**: Securely inject `JULES_API_KEY` into the integrated terminal session, allowing CLI tools to work out-of-the-box.

### Fixed
-   **UI Regressions**: Restored the "Broadcast" button and fixed the Log Panel layout (moved to bottom vertical split).
-   **Rendering**: Fixed blank screens in "Session Monitor" and "Manage Templates" dialogs.
-   **Activity Feed**: Fixed a bug where activity updates (e.g., status changes, artifacts) were ignored due to aggressive client-side filtering. Now correctly merges server state with local pending messages.

## [0.2.6] - 2025-12-26

### Added
-   **Submodule Dashboard**: Enhanced the System Dashboard to display commit dates for all submodules.
-   **Documentation**: Updated `LLM_INSTRUCTIONS.md` and other agent guides to enforce versioning and submodule protocols.

### Changed
-   **Build Script**: Updated `scripts/get-submodule-info.js` to capture actual commit dates from submodules.
-   **Versioning**: Bumped version to 0.2.6.

## [0.2.5] - 2025-12-25

### Added
-   **Real-time Submodule Status**: The System Dashboard now fetches live git status for all submodules, showing if they are synced, modified, or uninitialized.
-   **API**: New `/api/system/status` endpoint to expose git submodule status.

## [0.2.4] - 2025-12-25

### Added
-   **Memory Manager**: New feature to compact session history into "Memory Files" using an LLM.
-   **Context Injection**: Ability to save memories to the repo (`.jules/memories`) and copy them for injection into new sessions.
-   **API**: New `/api/memory` endpoint for handling compaction and file operations.

## [0.2.3] - 2025-12-25

### Added
-   **Council Debate Visualization**: New UI component to visualize multi-agent debate interactions in the Session Keeper.
-   **Documentation**: Standardized LLM instruction files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `GPT.md`) to reference a master `LLM_INSTRUCTIONS.md`.

### Changed
-   **Session Keeper**: Refactored `SessionKeeper` UI to include a tabbed view for Logs and Council Debates.
-   **Store**: Updated `SessionKeeperStore` to persist debate history.

## [0.2.2] - 2025-12-25

### Added
-   **Session Keeper**: Enhanced auto-pilot capabilities with "Debate Mode" and "Smart Supervisor".
-   **Versioning**: Added `VERSION.md` and centralized version management.
-   **Dashboard**: Added submodule status dashboard (upcoming).

### Fixed
-   **Build System**: Resolved merge conflicts in `analytics-dashboard.tsx`, `session-keeper-log-panel.tsx`, `combobox.tsx`, `resizable.tsx`, and `session-keeper.ts`.
-   **TypeScript Errors**: Fixed interface mismatches in `SessionKeeperSettings` and `AppLayout`.
-   **Submodules**: Updated all submodules to latest upstream versions.

### Changed
-   **UI**: Improved `SessionKeeperSettings` dialog with controlled state management.
-   **Architecture**: Refactored `SessionKeeperManager` to better handle debate/conference modes.

## [0.2.1] - 2025-12-25

### Added
-   **Super Protocol Template**: Added a comprehensive "All-in-One" protocol template to the Broadcast Dialog for streamlining maintenance workflows.

### Changed
-   **Session List UI**: Improved layout by displaying the repository name above the session title and moving the "last activity" time to a dedicated line for better readability.
-   **Broadcast Templates**: Refined the text of all broadcast templates for clarity and conciseness.

## [0.2.0] - 2025-12-24

### Added
-   **Broadcast Messages**: New feature to send messages to all open sessions simultaneously. Includes templates for common instructions.
-   **Kanban Board**: New view for managing sessions in a Kanban style (Running, Waiting, Done).
-   **Docker Optimization**: Switched terminal server base image from `nvcr.io/nvidia/pytorch` (32GB) to `python:3.11-slim-bookworm` (<1GB), significantly reducing disk usage.

### Changed
-   **Merged Feature Branches**: Integrated `jules-session-keeper-integration`, `feat-session-kanban-board`, `api-key-ux`, and `mobile-layout` into `main`.
-   **Session List**: Updated to support filtering and passing sessions to the Broadcast Dialog.
-   **Jules Client**: Added `updateSession` method and improved type definitions.

### Fixed
-   **Build Errors**: Resolved type mismatches and missing methods in `JulesClient`.
-   **Merge Conflicts**: Fixed conflicts in `session-list.tsx` and `activity-feed.tsx`.
-   **Build Stability:** Resolved lingering TypeScript errors in `app-layout.tsx` (event handler types) and `templates/route.ts` (implicit any).
-   **New Session Dialog:** Fixed arguments for `createSession` to match the updated client signature.
-   **Prisma:** Pinned Prisma version to 5.19.1 and fixed `schema.prisma` configuration for stable builds.

## [v0.8.0] - 2024-10-24

### Added
-   **System Dashboard:** Enhanced `/system/internals` to include submodule status.
-   **Unified Instructions:** Created `INSTRUCTIONS.md` as the single source of truth for all agents.

### Fixed
-   **Build Errors:** Resolved TypeScript errors in `lib/orchestration/providers`, `session-board`, and `new-session-dialog`.
-   **Persistence:** Fixed Prisma client initialization issues (downgraded to 5.19.1 for stability).
-   **Database:** Successfully initialized SQLite database with `KeeperSettings` and `KeeperLog`.
