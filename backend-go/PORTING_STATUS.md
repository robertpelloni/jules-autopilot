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
- Full port of TypeScript queue intelligence:
  - `handleCheckSession`
  - `handleIndexCodebase`
  - `handleCheckIssues`
- Full council supervisor / debate approval orchestration in Go
- RAG indexing and semantic query parity
- Full session activity/action parity with the TypeScript daemon
- WebSocket event parity beyond the currently implemented log + webhook broadcasts

## Recommended Next Go Porting Steps
1. Port `handleCheckSession` from TypeScript to Go.
2. Port `handleIndexCodebase` from TypeScript to Go.
3. Port issue evaluation and autonomous session spawning.
4. Add Go-side daemon event payload parity for session approval/nudge/debate events.
5. Decide whether the Go backend becomes the primary runtime or remains a parity track during migration.
