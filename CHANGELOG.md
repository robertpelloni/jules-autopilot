# Changelog

All notable changes to this project will be documented in this file.

## [0.2.6] - 2025-12-26

### Added
- **Submodule Dashboard**: Enhanced the System Dashboard to display commit dates for all submodules.
- **Documentation**: Updated `LLM_INSTRUCTIONS.md` and other agent guides to enforce versioning and submodule protocols.

### Changed
- **Build Script**: Updated `scripts/get-submodule-info.js` to capture actual commit dates from submodules.
- **Versioning**: Bumped version to 0.2.6.

## [0.2.5] - 2025-12-25

### Added
- **Real-time Submodule Status**: The System Dashboard now fetches live git status for all submodules, showing if they are synced, modified, or uninitialized.
- **API**: New `/api/system/status` endpoint to expose git submodule status.

## [0.2.4] - 2025-12-25

### Added
- **Memory Manager**: New feature to compact session history into "Memory Files" using an LLM.
- **Context Injection**: Ability to save memories to the repo (`.jules/memories`) and copy them for injection into new sessions.
- **API**: New `/api/memory` endpoint for handling compaction and file operations.

## [0.2.3] - 2025-12-25

### Added
- **Council Debate Visualization**: New UI component to visualize multi-agent debate interactions in the Session Keeper.
- **Documentation**: Standardized LLM instruction files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `GPT.md`) to reference a master `LLM_INSTRUCTIONS.md`.

### Changed
- **Session Keeper**: Refactored `SessionKeeper` UI to include a tabbed view for Logs and Council Debates.
- **Store**: Updated `SessionKeeperStore` to persist debate history.

## [0.2.2] - 2025-12-25

### Added
- **Session Keeper**: Enhanced auto-pilot capabilities with "Debate Mode" and "Smart Supervisor".
- **Versioning**: Added `VERSION.md` and centralized version management.
- **Dashboard**: Added submodule status dashboard (upcoming).

### Fixed
- **Build System**: Resolved merge conflicts in `analytics-dashboard.tsx`, `session-keeper-log-panel.tsx`, `combobox.tsx`, `resizable.tsx`, and `session-keeper.ts`.
- **TypeScript Errors**: Fixed interface mismatches in `SessionKeeperSettings` and `AppLayout`.
- **Submodules**: Updated all submodules to latest upstream versions.

### Changed
- **UI**: Improved `SessionKeeperSettings` dialog with controlled state management.
- **Architecture**: Refactored `SessionKeeperManager` to better handle debate/conference modes.

## [0.2.1] - 2025-12-25

### Added
- **Super Protocol Template**: Added a comprehensive "All-in-One" protocol template to the Broadcast Dialog for streamlining maintenance workflows.

### Changed
- **Session List UI**: Improved layout by displaying the repository name above the session title and moving the "last activity" time to a dedicated line for better readability.
- **Broadcast Templates**: Refined the text of all broadcast templates for clarity and conciseness.

## [0.2.0] - 2025-12-24

### Added
- **Broadcast Messages**: New feature to send messages to all open sessions simultaneously. Includes templates for common instructions.
- **Kanban Board**: New view for managing sessions in a Kanban style (Running, Waiting, Done).
- **Docker Optimization**: Switched terminal server base image from `nvcr.io/nvidia/pytorch` (32GB) to `python:3.11-slim-bookworm` (<1GB), significantly reducing disk usage.

### Changed
- **Merged Feature Branches**: Integrated `jules-session-keeper-integration`, `feat-session-kanban-board`, `api-key-ux`, and `mobile-layout` into `main`.
- **Session List**: Updated to support filtering and passing sessions to the Broadcast Dialog.
- **Jules Client**: Added `updateSession` method and improved type definitions.

### Fixed
- **Build Errors**: Resolved type mismatches and missing methods in `JulesClient`.
- **Merge Conflicts**: Fixed conflicts in `session-list.tsx` and `activity-feed.tsx`.
