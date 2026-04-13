### Project Architecture & Core Technologies
*   **Go-First Backend Pivot**: The project has completely migrated from a TypeScript/Bun daemon to a high-performance Go backend (`backend-go`). The `server/` directory containing Node.js/Bun code was entirely deleted.
*   **Frontend**: Built with React 19, Vite, and TailwindCSS v4. It operates as a Pure Single Page Application (SPA) with no Server-Side Rendering (SSR) overhead, utilizing Client-Side Rendering exclusively.
*   **Database**: SQLite with GORM for local persistence of settings, session state, queue jobs, logs, and anomaly tracking.
*   **Task Queue & Scheduler**: A native Go background task queue and cron scheduler exist for running tasks such as codebase indexing, CI monitoring, log cleanup, and Git diff anomaly detection.
*   **Wasm Plugin Isolation**: Uses the `wazero` runtime for executing Wasm plugins with zero CGO dependencies.
*   **Monorepo Structure**: Uses `pnpm` workspaces (`apps/*`, `packages/*`).

### Key Design Patterns & Decisions
*   **Single Source of Truth for Versioning**: The project relies on the `VERSION` file as the strict SSOT for version numbers. The Node.js script `scripts/update-version.js` synchronizes this version across `VERSION.md`, `lib/version.ts`, and multiple `package.json` manifests.
*   **Universal LLM Instructions**: All AI interactions must refer back to `LLM_INSTRUCTIONS.md` (which was standardized from `UNIVERSAL_LLM_INSTRUCTIONS.md`). Individual model files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `GPT.md`) act only as model-specific supplements.
*   **Intelligent Supervisor Fallback**: The supervisor uses a cascading fallback chain to optimize costs and bypass rate limits. The current priority is: `lmstudio -> openrouter/free -> kilocode/free -> cline/free -> openai -> anthropic -> gemini`.
*   **Shadow Pilot & Anomaly Detection**: Runs quietly in the background to detect issues before they break the pipeline. Currently implemented features include CI pipeline failure detection and a Git Diff Monitor (checking `git status --porcelain` every 15 minutes for >50 uncommitted files or merge conflicts `UU`).
*   **Collective & Submodules**: Tracks interconnected submodules and repositories. Submodule state is actively checked via native git commands in the Go backend (`/api/system/submodules/status`) rather than static build-time files.
*   **Environment First Configuration**: Core settings (like API keys, provider selection) prioritize `os.Getenv` overrides from a root `.env` file before falling back to database-persisted values.

### Recent Fixes & Implementations
*   **Render Deployment Blockers**: Enforced `go 1.26.0` in `go.mod` to ensure compatibility with Render's cloud environment.
*   **Supervisor Telemetry Visibility**: Enriched the Go Daemon loop and Queue worker with explicit `addKeeperLog` calls to broadcast their execution state and queued jobs to the frontend UI's live Keeper feed via WebSockets.
*   **State Persistence Fixes**: Fixed the React frontend's Supervisor and Autopilot toggles to correctly synchronize with the global Zustand `useSessionKeeperStore` and trigger backend updates, instead of modifying isolated local state.
*   **Global Documentation Parity**: Rebuilt the root `HANDOFF.md`, `DEPLOY.md`, `MEMORY.md`, and `IDEAS.md` files to ensure seamless continuous context handover for sequential AI agents interacting with the repository.