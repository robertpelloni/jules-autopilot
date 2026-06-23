# Session Handoff — June 22-23, 2026

## Summary
Major overhaul of the nudge/bump system and daemon reliability in the Go backend.

## What was done

### Daemon Reliability
- Added `defer recover()` to daemon loop — goroutine was crashing silently, `isRunning` stayed `true`, making health check a zombie detector
- Split tick into `tickAndWait()` with panic recovery and auto-restart
- Non-blocking `StopDaemon()` channel send avoids deadlock on dead goroutines

### Nudge System Rewrite
- **Recovery messages removed** — all sessions (FAILED/PAUSED/COMPLETED) get same nudge treatment
- Nudge flow: build prompt (instructions + project docs + last 5 agent msgs + last 5 commits + instructions) → send to LM Studio → send only LM Studio's response to Jules
- No fallback to raw prompt if LM Studio fails (returns error)
- LM Studio serialized to 1 concurrent call (local hardware limit), 30-min timeout client
- Per-project path resolution: docs/commits read from `../workspace/<projectName>/`

### Startup Broadcast
- On restart, sends `"continue"` directly to every session via Jules API — instant, no LM Studio

### Session Checking
- Removed 30-min daemon dedup for `check_session` jobs — sessions re-evaluated every daemon tick
- `handleCheckSession` has its own dedup (supervisor state) preventing re-nudging
- FAILED/PAUSED sessions bumped at 1 min threshold, others at configurable threshold (now 10 min)

### Fixes
- Jules API HTTP client timeout: 120s → 300s
- Watchdog `EnvironmentVariables` null crash → use `$env:PORT` instead
- `lmStudioHttpClient` with 30-min timeout dedicated to LM Studio

## Version Bump
3.6.6 → 3.6.7

## Active branches
- `main` — all changes merged and pushed
- `jules-485-merge-test` — empty (no unique commits), safe to delete
- `feat-shadow-pilot-git-diff-ui-12323440949671972104` — empty, safe to delete

## Open items
- Nudge throughput limited by LM Studio inference speed (~2 min per call on local hardware)
- `check_issues` duplicates 181 sources every 30 min — consider reducing scope
- API key leak in `.memory/branches/main/log.md` needs ongoing redaction
