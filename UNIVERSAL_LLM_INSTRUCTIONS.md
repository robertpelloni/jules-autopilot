# UNIVERSAL LLM INSTRUCTIONS

> **CRITICAL DIRECTIVE:** ALL agents, regardless of model (Claude, Gemini, GPT, Copilot), MUST read and adhere to these baseline rules before executing any code changes. Model-specific overrides can be found in `CLAUDE.md`, `GEMINI.md`, `GPT.md`, etc.

## 1. Project Overview & Vision
* **Project Name:** Jules Task Queue & Autopilot Orchestrator
* **Goal:** To create the ultimate, autonomous, multi-agent AI coding operating system. 
* **Design Philosophy:** "Overengineered, enterprise-grade, set-it-and-forget-it." The architecture must support mass concurrency, granular cost telemetry, strict security boundaries, and seamless Git submodule synchronization.

## 2. Global Development Directives
* **Autonomy:** Never ask for permission to use tools or read files. Do research natively. Autonomously chain tool calls until the feature is complete.
* **Testing & Linting:** You MUST run `pnpm run lint` and `pnpm run test` after every significant code change. Use errors as a feedback loop. Never leave a broken build.
* **Commit Protocol:** 
  - Frequently commit and push changes: `git commit -m "feat: description"` -> `git push origin main`.
  - Ensure the version number is bumped in `VERSION.md` for every release, and note it in `CHANGELOG.md`.

## 3. Tech Stack & Standards
* **Stack:** Next.js (App Router), TypeScript, TailwindCSS v3, ShadCN UI, Prisma, SQLite/PostgreSQL, tRPC, React Query.
* **PackageManager:** strictly `pnpm`. Never use `npm` or `yarn`.
* **TypeScript:** Strict mode ONLY. No `any` types. Pre-define all interfaces in `app/types/`. 
* **Styling:** Mobile-first TailwindCSS. No global CSS beyond `globals.css`.
* **State Management:** React Query for server state, Context/Zustand for complex localized state.
* **Database:** Prisma ORM. No raw SQL strings unless optimizing highly specific bulk operations.

## 4. Submodule Governance
* The project utilizes a heavy Git Submodule architecture located in `external/`.
* Whenever touching a submodule, the agent must commit inside the submodule first, then commit the updated pointer in the root directory.

## 5. Artifacts and Handoffs
* For massive codebase changes, aggressively document findings in `HANDOFF.md` before ending a session.
* Continually update `ROADMAP.md` and `TODO.md` to reflect the exact state of what is finished vs. what is remaining.
