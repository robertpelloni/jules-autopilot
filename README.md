# Jules Autopilot

An orchestration dashboard for the Google Jules AI agent: a unified,
real-time command center that replaces Jules' official interfaces, with a
Go backend runtime (API, WebSocket server, scheduler, static SPA host) and
a React frontend.

> **Alpha software under construction.** Backwards compatibility is not
> guaranteed; expect breaking changes and bugs.

## Status

**Active development — v3.7.3** (2026-11-07/08). Last commit:
**2026-11-12** (Protocol #281 merges and watchdog fixes).

**Important context:** Google Jules winds down **December 31, 2026**, and
went read-only on 2026-11-11. This tool orchestrates Jules sessions, so its
useful life is tied to Jules itself. The repo's Go/queue/scheduler/alpha
details have not been independently verified — treat the architecture claims
in the docs as the author's, not as proven.

## Stack

- **Backend/runtime:** Go (API, WebSocket server, scheduler, static SPA host)
- **Frontend:** Vite + React 19 (pure SPA)
- **Database:** GORM + SQLite (local persistence)
- **Queue & automation:** Native Go task queue and RAG indexer
- **Styling:** Tailwind CSS v4

## Getting started

Prerequisites: Go 1.21+, Node.js and pnpm (for frontend development).

```bash
git clone https://github.com/robertpelloni/jules-autopilot.git
cd jules-autopilot

pnpm install
pnpm run build

# Run the Go runtime (serves the built frontend)
cd backend-go
go run .
```

See `DEPLOY.md` for deployment details and `RAG_ARCHITECTURE.md` for the
indexer design.

## What's not / known gaps

- Jules itself is winding down (see Status above) — this is a tool with a
  known end date.
- The repo carries working clutter: session markers, runtime databases
  (`.db` files tracked in the tree), per-assistant instruction files, and
  Playwright/test-result artifacts.
- No released build or public deployment is documented here.

## Last significant activity

- **2026-11-12** — Protocol #281 merges; watchdog consecutive-failure
  policy and runtime-state untracking.
- **2026-11-08** — watchdog fix (v3.7.3).
- **2026-11-07** — repository sync & intelligent merge, session status
  tooltip (v3.7.3).

## License

See `LICENSE` in the repo root.

## Links

- Author: https://robertpelloni.com
- Related: TormentNexus (https://github.com/MDMAtk/TormentNexus)
