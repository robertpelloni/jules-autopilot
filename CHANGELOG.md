# Changelog

All notable changes to this project will be documented in this file.

## [0.4.7] - 2025-12-27

### Added
- **Save as Template:** New workflow to save the current session as a reusable template.
- **Deep Code Review:** Integrated `ArtifactBrowser` with `DebateDialog` for file-specific reviews.
- **Debate Enhancements:** Lifted `DebateDialog` to `AppLayout` for global access and pre-filling context.

## [0.4.5] - 2025-12-27

### Added
- **Deep Code Analysis Orchestrator:** Implemented `lib/orchestration/review.ts` to run parallel LLM audits (Security, Performance, Maintainability) and synthesize results.
- **Deep Analysis Action:** Added "Deep Analysis" button to `ArtifactBrowser` for inspecting code artifacts using the new orchestrator.
- **Quick Review Enhancement:** Improved the default "Quick Review" prompt to request structured analysis.

## [0.4.4] - 2025-12-27

### Added
- **System Dashboard Enhancement:** Added build number and detailed project structure documentation.
- **Documentation:** Consolidated LLM instructions and updated all agent-specific guides.

## [0.4.2] - 2025-12-27

### Added
- **Interactive Debate:** Enhanced the Multi-Agent Debate feature with structured rounds and a visual viewer (`DebateViewer`).
- **Activity Types:** Added `debate` activity type to support rich rendering of debate sessions.

## [0.4.1] - 2025-12-27

### Added
- **Artifact Browser:** New "Files" view to browse generated artifacts (diffs, terminals, images).
- **Documentation:** Created universal `LLM_INSTRUCTIONS.md` and updated agent-specific guides.
- **Submodules:** Updated `external` submodules to latest versions.

## [0.4.0] - 2025-12-27

### Added
- **Session Keeper:** Automated session monitoring and approval system.
- **Kanban Board:** Visual management of sessions (Active, Paused, Completed).
- **Multi-Agent Debate:** Added debate orchestration logic and UI.
- **System Dashboard:** Detailed view of project structure and submodules.
- **Session Templates:** Quickly start sessions from predefined templates.
- **Submodule Reference:** Added `jules-sdk-reference` as a submodule.

### Changed
- **API Client:** Updated `JulesClient` to match Python SDK capabilities.
- **UI:** Significant enhancements to `AppLayout`, `ActivityFeed`, and `AnalyticsDashboard`.
- **Dependencies:** Added `react-hook-form`, `zod`, `sonner`, `@dnd-kit`.

### Fixed
- **Merge Conflicts:** Resolved extensive merge conflicts across the codebase.
- **Debug Logs:** Removed verbose debug logging from API routes.
