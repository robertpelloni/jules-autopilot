# Changelog

All notable changes to this project will be documented in this file.

## [0.5.1] - 2025-12-28

### Added
- **Production Docker:** Multi-stage `Dockerfile` with `runner` target for optimized standalone builds.
- **Production Compose:** `deploy/docker-compose.prod.yml` for simplified production deployment.
- **CI/CD:** GitHub Actions workflow (`.github/workflows/ci.yml`) for build and lint verification.

## [0.5.0] - 2025-12-28

### Added
- **Secure Authentication:** Implemented secure, HTTP-only cookie-based authentication.
    - Replaced client-side `localStorage` API Key storage with server-side session management.
    - Added `/login` page and API routes (`login`, `logout`, `me`).
    - Added Middleware to protect routes.
    - Encrypted session storage using `jose`.

### Changed
- **API Architecture:** `JulesClient` now relies on the proxy to inject credentials from the secure session.
- **Frontend Flow:** Application now redirects to login if unauthenticated.

## [0.4.7] - 2025-12-27

### Added
- **Save as Template:** New workflow to save the current session as a reusable template.
- **Deep Code Review:** Integrated `ArtifactBrowser` with `DebateDialog`.
- **Debate Enhancements:** Lifted `DebateDialog` to `AppLayout`.

## [0.4.5] - 2025-12-27

### Added
- **Deep Code Analysis Orchestrator:** Implemented `lib/orchestration/review.ts`.
- **Deep Analysis Action:** Added "Deep Analysis" button to `ArtifactBrowser`.
- **Quick Review Enhancement:** Improved default prompt.

## [0.4.4] - 2025-12-27

### Added
- **System Dashboard Enhancement:** Added build number and detailed project structure documentation.
- **Documentation:** Consolidated LLM instructions.

## [0.4.2] - 2025-12-27

### Added
- **Interactive Debate:** Visual viewer (`DebateViewer`) for debates.
- **Activity Types:** Added `debate` activity type.

## [0.4.1] - 2025-12-27

### Added
- **Artifact Browser:** File explorer for artifacts.
- **Documentation:** Updated agent guides.
- **Submodules:** Updated.

## [0.4.0] - 2025-12-27

### Added
- **Session Keeper:** Auto-Pilot monitoring.
- **Kanban Board:** Session management.
- **Multi-Agent Debate:** Orchestration logic.
- **System Dashboard:** Project status.
- **Session Templates:** Templates.
- **Submodule Reference:** Python SDK.

### Changed
- **API Client:** Updated `JulesClient`.
- **UI:** Enhancements to Layout/Feed/Dashboard.
- **Dependencies:** Updated.

### Fixed
- **Merge Conflicts:** Resolved.
- **Debug Logs:** Removed.
