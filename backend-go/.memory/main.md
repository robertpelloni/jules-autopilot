# Jules Autopilot — Project Roadmap

## Project Purpose

Jules Autopilot is an autonomous AI coding command center that monitors Google
Jules AI coding sessions, nudges inactive sessions, manages GitHub issues, and
provides oversight — all running as a Go backend with a React frontend.

## Current State (June 22, 2026)

The Go backend (`backend-go/`) is the primary runtime. It runs on **port 8082**
and connects to the Jules API, manages a queue of background jobs, and uses
**LM Studio** (localhost:1234) as the LLM provider.

### Running Services

| Service | Port | Tech |
|---------|------|------|
| Jules Backend | 8082 | Go (Fiber v2) |
| LM Studio | 1234 | Local LLM (gemma-4-26b) |
| FreeLLM | 4000 | LLM proxy |

### Nudge System (latest behavior)

**Recovery messages are removed.** The nudge system bumps ALL inactive sessions
with no exceptions — FAILED, PAUSED, COMPLETED all get bumped.

**Flow:**
1. Daemon polls Jules API for active sessions every ~5 min
2. For each session past its inactivity threshold, builds a prompt:
   - Instructions + project docs + last 5 agent messages + last 5 git commits + instructions again
3. Prompt sent to **LM Studio** (30 min timeout via `lmStudioHttpClient`)
4. Only LM Studio's **response** is sent to the Jules session — never raw context
5. If LM Studio fails, the nudge fails (no fallback to raw prompt)

**Dedup logic:** If last message is from "user" (us) and the one before it is from
"agent", the agent was actively working when we nudged and hasn't replied yet — wait.
If last message is from user and the one before is also user, the agent never saw
our nudge — bump again.

**Thresholds:**
- FAILED / PAUSED → 1 min (bump ASAP)
- IN_PROGRESS → ActiveWorkThresholdMinutes
- COMPLETED → InactivityThresholdMinutes

### Path Resolution

Project docs and git commits are read from `../workspace/<projectName>/` relative
to the backend CWD (`backend-go/`). This resolves to the workspace mirror of the
session's GitHub repo.

### LM Studio Timeout

A dedicated `lmStudioHttpClient` with **30 minute timeout** routes LM Studio
requests through `generateOpenRouterText` when the model name contains "lmstudio"
or starts with "gemma-4".

## Key Decisions

- **2026-06-22:** Removed recovery messages entirely. All sessions (FAILED/PAUSED/COMPLETED) get the same nudge treatment.
- **2026-06-22:** Nudge prompt goes to LM Studio; only LM Studio's response goes to Jules. Raw prompt never sent.
- **2026-06-22:** Project docs/commits resolved from `../workspace/<projectName>/` (workspace mirrors), not the autopilot's own root.
- **2026-06-22:** LM Studio gets a dedicated 30-min timeout client.
- **2026-06-22:** Nudge dedup: only block if `[..., agent, user]` pattern (agent active before our nudge, pending reply). `[..., user, user]` resends.

## Milestones

- [x] Go backend running on port 8082 with Fiber
- [x] Daemon polls Jules API for sessions
- [x] Queue worker with 50 concurrent goroutines
- [x] Nudge system sending context through LM Studio
- [x] Recovery messages removed
- [x] Per-project workspace path resolution
- [x] LM Studio long timeout (30 min)
- [x] Smart dedup for nudge messages

## Local Repo Paths

- Backend binary: `backend-go/backend.exe`
- CWD at runtime: `C:\Users\hyper\workspace\jules-autopilot\backend-go\`
- Workspace mirrors: `C:\Users\hyper\workspace\`
- DB: `backend-go/dev.db`
- Watchdog log: `backend-go/watchdog.log`
