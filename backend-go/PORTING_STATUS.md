# Go Porting Status

## Goal
Move reasonable backend responsibilities from the TypeScript/Bun daemon into the Go backend while preserving feature parity where practical.

## Newly Ported in This Pass
- API manifest served from canonical root `VERSION`
- `GET /api/ping`
- `GET /api/manifest`
- `GET /api/fleet/summary`
- `GET /api/system/submodules`
- `GET /api/sessions/:id/replay`
- `POST /api/webhooks/borg`
- `POST /api/webhooks/hypercode`
- Main Go backend now listens on `:8080` for easier drop-in parity with the TypeScript daemon
- Queue worker compile issues fixed (`os` / `strings` imports, QueueJob struct tag fix)
- Go realtime event/log bridge (`backend-go/services/realtime.go`) for Keeper-style websocket emission from automation paths
- Go `handleCheckSession` automation path with:
  - live session refresh from Jules
  - activity-update event emission
  - inactivity-based nudges
  - completed-session memory sync enqueueing
  - conservative low-risk plan auto-approval
  - high-risk escalation event emission
- `POST /api/sessions/:id/nudge` now sends a real activity instead of returning a stub response
- `POST /api/sessions/:id:approvePlan` is now supported through the generic Go session action handler

## Existing Go Coverage
- Keeper settings routes
- Daemon status routes
- Session listing / activity creation
- Export to repo / save memory
- Broadcast route
- Fleet sync route
- SQLite-backed queue worker scaffold
- WebSocket broadcasting

## Still Pending / Partial
- Remaining queue intelligence ports:
  - `handleIndexCodebase`
  - `handleCheckIssues`
- Full council supervisor / debate approval orchestration in Go (current Go path uses a conservative heuristic risk scorer and escalation events instead of full provider-backed debate execution)
- RAG indexing and semantic query parity
- Full session activity/action parity with the TypeScript daemon
- Broader WebSocket event parity beyond the currently implemented log, queue, and webhook broadcasts

## Recommended Next Go Porting Steps
1. Port `handleIndexCodebase` from TypeScript to Go.
2. Port issue evaluation and autonomous session spawning (`handleCheckIssues`).
3. Replace the heuristic Go plan-risk path with provider-backed council debate parity.
4. Broaden Go-side daemon event payload parity for recovery, indexing, and issue-spawn lifecycle events.
5. Decide whether the Go backend becomes the primary runtime or remains a parity track during migration.
