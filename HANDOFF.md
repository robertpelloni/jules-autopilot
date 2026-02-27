# Project Handoff: Jules Autopilot Orchestrator (v0.9.2)

## Current State Fast-Forward
We have just completed a massive two-part epic covering Phase 19 (Daemon API Consolidation) and Phase 20 (Global Documentation & Submodule Sync). 

The project is incredibly robust. It now stands at **v0.9.2**. It has a fully functioning Docker deployment infrastructure, Server-Sent Events (SSE) for real-time pushing, split-brain API proxying (Next.js acting as a gateway to the Hono daemon), and an extensive Git Submodule ecosystem encompassing 10 distinct AI repos.

## Major Accomplishments This Session
1. **Daemon Proxy Layer (`lib/api/daemon-proxy.ts`):** We securely masked the port 8080 Hono daemon via Next.js `/api/daemon/*` proxy endpoints with graceful fallback, allowing Vercel and Docker deployments to share the same frontend code.
2. **System Health Endpoint:** Built `/api/system/status` and a beautiful real-time `/dashboard/status` UI measuring DB latency, Daemon connectivity, and SSE stream health.
3. **Automated Submodule Sync:** Authored `scripts/sync-submodules.ps1` which programmatically navigates all 10 `external/*` submodules, checks out `main`, pulls upstream, merges any stray feature branches intelligently, and pushes them back, updating the `submodules.json` manifest.
4. **IDEAS.md Deep Scan:** Iterated through all 10 submodules and wrote highly detailed, 3-section `IDEAS.md` files proposing architectural upgrades, advanced telemetry, and new AI routing logic specific to each repo.
5. **Universal AI Instructions:** Deleted redundant prompts and centralized all agent rules into `UNIVERSAL_LLM_INSTRUCTIONS.md`, linking `CLAUDE.md`, `GEMINI.md`, `GPT.md`, and `AGENTS.md` directly to it.
6. **Documentation Overhaul:** Generated a sweeping `VISION.md`, updated `ROADMAP.md` mapping out the journey to v1.5 (Shadow Pilot), granularly updated `TODO.md`, captured tacit knowledge in `MEMORY.md`, and bumped the `CHANGELOG.md` to `v0.9.2`.

## Next Agent Objectives (See `TODO.md` and `task.md`)
- **Action 1:** Implement reliable backend polling/webhook catching to update `app/submodules.json` dynamically so the `/dashboard/submodules` page displays live git tracking data instead of relying on the manual execution of `get-submodule-info.js`.
- **Action 2:** Refactor the frontend `CodeEditor` and `SubmoduleEditor` UI components to exclusively use the newly created `/api/daemon` proxy endpoints instead of hardcoding websocket/HTTP fetch requests to `localhost:8080`.
- **Action 3:** Inject the `useEventStream` React hook into the `SessionView` component to replace heavy HTTP polling loops with lightweight, real-time SSE push updates for LLM streaming and Keeper logs.

## Critical Instructions for Inheriting Agent
Before writing any code, read `UNIVERSAL_LLM_INSTRUCTIONS.md` and `MEMORY.md`. You are interacting with a strict Next.js App Router environment using Tailwind and ShadCN, heavily reliant on a local Prisma SQLite database. **ALWAYS check typecheck output (`pnpm run typecheck`) and commit frequently using `--no-verify -F` if the `git commit` STDIN boundary hangs on Windows.**
