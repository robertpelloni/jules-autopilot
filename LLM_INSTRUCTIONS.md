# Universal LLM Instructions for Jules UI

This document serves as the central source of truth for all AI models (Claude, Gemini, GPT, Copilot) working on the Jules UI project.

## Project Overview
Jules UI is a modern, developer-first interface for Google's Jules AI agent. It is built with Next.js 15+ (App Router), React 19, Tailwind CSS, and Shadcn UI.

## Core Principles
1.  **Developer-First**: The UI is designed for power users. Dense information, keyboard shortcuts, and dark mode are priorities.
2.  **Autonomous**: The system should be able to run with minimal human intervention (Session Keeper).
3.  **Robust**: Error handling, type safety (TypeScript), and clean architecture are mandatory.

## Coding Standards
-   **Framework**: Next.js 15+ (App Router). Use `use client` only when necessary.
-   **Styling**: Tailwind CSS. Use `cn()` for class merging.
-   **Components**: Shadcn UI (Radix Primitives).
-   **State**: Zustand for global state, React Context for providers.
-   **Icons**: Lucide React.

## Versioning & Changelog
-   **Single Source of Truth**: The version number is stored in `VERSION.md`.
-   **Update Protocol**:
    1.  Read `VERSION.md`.
    2.  Increment the version number (SemVer).
    3.  Update `VERSION.md`.
    4.  Update `package.json`.
    5.  Update `CHANGELOG.md` with a new section for the version.
    6.  Commit with message: `chore: bump version to X.Y.Z`.

## Submodules
The project relies heavily on submodules in `external/`.
-   **Always** run `git submodule update --init --recursive` when starting.
-   **Never** modify submodule code directly unless you intend to push upstream.
-   **Dashboard**: The System Dashboard (`/system`) provides a real-time view of submodule versions, commit dates, and sync status. Ensure `scripts/get-submodule-info.js` is run during build.

## Feature Roadmap
See `ROADMAP.md` for the current status of features.

## Handoff Protocol
When finishing a session, update `HANDOFF.md` with:
1.  Current state of the project.
2.  Recent changes.
3.  Known issues.
4.  Next steps.
5.  **Submodule Status**: Note any submodules that were updated or need attention.

## Universal Agent Protocol
All agents (Claude, Gemini, GPT, Copilot) must:
1.  **Plan**: Outline steps before executing.
2.  **Context**: Read this file and `ROADMAP.md` before starting.
3.  **Version**: Check `VERSION.md` and increment for significant changes.
4.  **Test**: Verify builds after changes.
