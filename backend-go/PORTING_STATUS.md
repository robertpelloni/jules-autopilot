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
- Go Jules client support for GitHub issues + session creation
- `POST /api/sessions/:id/nudge` now sends a real activity instead of returning a stub response
- `POST /api/sessions/:id:approvePlan` is now supported through the generic Go session action handler
- `POST /api/fleet/sync` now also enqueues issue-check jobs and a codebase indexing job

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
- Full session activity/action parity with the TypeScript daemon
- Additional provider/runtime polish around Go-side structured review/debate abstractions beyond the current practical provider bridge
- More explicit Go-side retrieval/result presentation surfaces if the UI should call Go-native memory workflows directly more often
- More refined Go-side recovery state tracking to avoid redundant guidance across edge cases

## Recommended Next Go Porting Steps
1. Fill any remaining session activity/action route gaps in the Go API.
2. Refine Go-side recovery state tracking and edge-case handling.
3. Tighten Go-side provider abstractions for structured review/debate/recommendation workflows.
4. Add richer Go-native retrieval/result presentation hooks where the UI would benefit from more explicit memory reasoning metadata.
5. Decide whether the Go backend becomes the primary runtime or remains a parity track during migration.
