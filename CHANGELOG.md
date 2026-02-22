# Changelog

All notable changes to this project will be documented in this file.

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
