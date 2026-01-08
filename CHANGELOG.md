# Changelog

All notable changes to this project will be documented in this file.

## [0.7.1] - 2026-01-08

### Added
-   **Dashboard:** Enhanced Submodule Dashboard to display git descriptions (tags) for better version tracking.

### Changed
-   **Submodules:** Updated all external submodules to their latest upstream versions.
-   **Maintenance:** Merged all pending feature branches (`palette`, `kanban`, `mobile-layout`, `copilot`) into `main` and resolved conflicts.
-   **Dependencies:** Regenerated `pnpm-lock.yaml` to resolve merge conflicts.

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
-   **Bobcoin Wallet UI:** Added a wallet interface at `/wallet` to manage balance and transaction history.
-   **System Dashboard:** Enhanced `/system/internals` to include Bobcoin submodule status.
-   **Bobcoin Submodule:** Integrated `bobcoin` (Solana/Monero hybrid) as the core blockchain submodule.
-   **Unified Instructions:** Created `INSTRUCTIONS.md` as the single source of truth for all agents.

### Fixed
-   **Build Errors:** Resolved TypeScript errors in `lib/orchestration/providers`, `session-board`, and `new-session-dialog`.
-   **Persistence:** Fixed Prisma client initialization issues (downgraded to 5.19.1 for stability).
-   **Database:** Successfully initialized SQLite database with `KeeperSettings` and `KeeperLog`.
