# Jules Autopilot — Project Roadmap

## Project Purpose

Jules Autopilot is an autonomous AI coding command center that monitors Google
Jules AI coding sessions, nudges inactive sessions, manages GitHub issues, and
provides recovery oversight — all running as a Go backend with a React frontend.

## Current State (June 22, 2026)

The Go backend (`backend-go/`) is the primary runtime. It runs on **port 8082**
(lmstudio), connects to the Jules API, and manages a queue of background jobs.

### Running Services

| Service | Port | Tech |
|---------|------|------|
| Jules Backend | 8082 | Go (Fiber) |
| LM Studio | 1234 | Local LLM |
| FreeLLM | 4000 | LLM proxy |

### LLM Call Chain

1. **LM Studio** (`localhost:1234`) — primary, 90s timeout, 3 retries on model unload
2. No fallbacks configured — only LM Studio

### Queue System

- Worker: 50 concurrent goroutines
- Daemon tick: every 5 minutes (minimum, clamped)
- Session dedup: 30-min cooldown per session
- Failed session cooldown: 1 hour
- 429 rate-limit backoff: 30 seconds
- Queue clears on startup
- DB vacuumed on startup
- Failed jobs auto-cleaned after 1 hour

### Nudge Behavior

When a session is inactive beyond the threshold:
- Checks last message role — skips if last message is from "user"
- Builds a prompt: INSTRUCTIONS + DOCUMENTATION + LAST 5 AGENT MESSAGES + GIT COMMITS + INSTRUCTIONS AGAIN
- Sends to LM Studio for response
- No recovery guidance for failed sessions (only nudges)

### Database

- SQLite (`dev.db`), ~5MB, WAL mode
- Indexes on `queue_jobs(status, updated_at, type+status)`
- Scheduled for periodic VACUUM on startup

## Key Decisions Made

1. **Go backend as primary runtime** — Bun/Node backend removed, Go serves SPA from `dist/`
2. **SQLite for local dev** — no PostgreSQL dependency, WAL mode for concurrency
3. **LM Studio only** — no OpenRouter/FreeLLM fallback chain
4. **Port 8082** — changed from 8081 to avoid conflict with `fwber-geo` Windows service
5. **No PROJECT_MEMORY prompts** — `sync_session_memory` handler returns "skipped" immediately
6. **PowerShell watchdog** — `watchdog_loop.ps1` checks every 30s, restarts on failure
7. **Auto-start via Startup folder** — `JulesAutopilot.cmd` in user's Startup folder
8. **DB indexes + VACUUM** — prevents 16s crash queries from SQLite bloat

## Milestones

### Completed
- [x] Go backend parity (all Bun features ported)
- [x] Queue system with worker pool, dedup, rate-limit backoff
- [x] LM Studio integration as sole LLM provider
- [x] Session nudging with rich context (docs, commits, agent messages)
- [x] DB cleanup (indexes, VACUUM, WAL mode)
- [x] Windows services config registration
- [x] Auto-start on boot (Startup folder)
- [x] Watchdog with auto-restart

### Planned
- [ ] RAG indexing (memory_chunks & code_chunks tables exist but empty)
- [ ] Vite dev server for hot-reload UI development
- [ ] Monitor "agent did not provide [PROJECT_MEMORY]" failures (sync_session_memory skipped for now)
- [ ] Frontend served on separate port with proxy to backend
