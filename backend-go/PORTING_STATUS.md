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
- Go `handleIndexCodebase` with:
  - project-root aware file discovery
  - repository traversal across `src`, `lib`, `server`, `components`, and `packages`
  - `.ts`/`.tsx`/`.js`/`.jsx`/`.md` chunking
  - checksum-based chunk deduplication
  - OpenAI embeddings ingestion
  - SQLite `CodeChunk` upserts
- Go `handleCheckIssues` with:
  - GitHub issue fetching
  - duplicate-title filtering against active sessions
  - hybrid issue evaluation (provider-backed JSON triage when available, conservative heuristic fallback otherwise)
  - autonomous Jules session creation for high-confidence issues
  - Keeper log coverage for evaluation and spawn lifecycle events
- Go provider-backed council review in `handleCheckSession` with:
  - multi-role debate turns
  - moderator synthesis
  - provider-backed risk rescoring
  - approval/rejection feedback sent back to the Jules session
  - persisted debate records in SQLite
  - `session_debate_resolved` payloads carrying risk/summary/decision data
- Shared Go LLM provider layer in `backend-go/services/llm.go` for OpenAI, Anthropic, and Gemini-backed text generation
- Go semantic retrieval layer in `backend-go/services/rag.go` with:
  - OpenAI query embedding generation
  - cosine similarity search across both `CodeChunk` and `MemoryChunk`
  - combined codebase/history ranked results
- `POST /api/rag/query` now exists in the Go API
- Go `check_session` nudges can now include retrieved local context snippets
- Explicit Go lifecycle event emission for:
  - codebase indexing start/completion
  - issue-check start
  - issue evaluation
  - autonomous issue-session spawning
  - failed-session recovery start/completion
- Frontend/shared websocket layer updated to understand those Go-originated lifecycle events
- Go failed-session recovery path that:
  - detects `FAILED` sessions
  - generates provider-backed recovery guidance
  - can append Go-native RAG context
  - messages recovery instructions back into the Jules session
- Go session patch/update support via `PATCH /api/sessions/:id`
- Go direct session/activity read routes via:
  - `GET /api/sessions/:id`
  - `GET /api/sessions/:id/activities`
- Go-native `POST /api/rag/reindex`
- Go filesystem utility routes via:
  - `GET /api/fs/list`
  - `GET /api/fs/read`
- Go template CRUD routes via:
  - `GET /api/templates`
  - `POST /api/templates`
  - `PUT /api/templates/:id`
  - `DELETE /api/templates/:id`
- Go review routes via:
  - `POST /api/review`
  - `POST /api/local/review`
- Go review service with:
  - simple review mode
  - comprehensive persona-based review mode
  - structured JSON review mode
- Go portability routes via:
  - `GET /api/export`
  - `POST /api/import`
- Go debate routes via:
  - `POST /api/debate`
  - `GET /api/debate/history`
  - `GET /api/debate/:id`
  - `DELETE /api/debate/:id`
- Go debate execution/persistence service in `backend-go/services/debate.go`
- Go observability routes via:
  - `GET /metrics`
  - `GET /healthz`
  - `GET /api/health`
- Go daemon-running introspection for observability reporting
- Go Jules client support for source discovery, GitHub issues, and session creation
- `POST /api/sessions/:id/nudge` now sends a real activity instead of returning a stub response
- `POST /api/sessions/:id:approvePlan` is now supported through the generic Go session action handler
- `POST /api/fleet/sync` now also enqueues issue-check jobs and a codebase indexing job
- Go daemon loop now mirrors more Bun orchestration behavior by:
  - honoring Keeper `checkIntervalSeconds`
  - resolving Jules credentials from env or stored Keeper settings
  - scheduling `check_session` jobs from live Jules sessions
  - scheduling `check_issues` jobs from discovered Jules sources when smart pilot is enabled
  - opportunistically enqueueing `index_codebase` when no indexing job is already pending/processing
  - emitting Keeper-log telemetry for daemon poll/scheduling outcomes

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
- Additional provider/runtime polish around Go-side structured review/debate abstractions beyond the current practical provider bridge
- More explicit Go-side retrieval/result presentation surfaces if the UI should call Go-native memory workflows directly more often
- Residual recovery-state edge-case refinement if further duplication/race cases are observed in practice
- Residual product-surface parity gaps outside the core session/memory/control loop if any are still meant to migrate fully into Go

## Recommended Next Go Porting Steps
1. Tighten Go-side provider abstractions for structured review/debate/recommendation workflows.
2. Add richer Go-native retrieval/result presentation hooks where the UI would benefit from more explicit memory reasoning metadata.
3. Audit whether any remaining non-core product surfaces still need Go-native coverage.
4. Continue observing/refining recovery edge cases if duplication or race conditions still surface.
5. Decide whether the Go backend becomes the primary runtime or remains a parity track during migration.
