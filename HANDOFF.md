# Project Handoff: Jules Autopilot (v0.9.3 - Stabilized Auth & Messaging)

## 1. Executive Summary
This session successfully restored core functionality for the Jules Autopilot system, specifically targeting the high-privilege session tokens from the Jules Portal. We resolved critical authentication blocks, fixed cascading server failures, and hardened the mass-messaging (broadcast) system for high-scale environments.

### Recent Wins (v0.9.3)
- **Verified Authentication Protocol**: Identified that Jules Portal tokens (`AQ.A...`) are strictly incompatible with the standard `Authorization: Bearer` header. They now exclusively use `x-goog-api-key` header with all other auth headers stripped. (See `docs/AUTHENTICATION.md`)
- **Mass-Messaging Safety**: Implemented a **500ms mandatory delay** between broadcast messages in `BroadcastDialog.tsx`. This successfully prevents `429 Too Many Requests` when communicating with 30+ sessions.
- **Routing Reliability**: Fixed backend routing in `server/index.ts` to correctly parse custom actions like `sessions/ID:sendMessage`, which previously returned 404s.
- **Zero-Downtime Provider Bridge**: Added a "Safety Bridge" alias in `JulesProvider.tsx` (`triggerRefresh: refresh`) to prevent `ReferenceError` crashes caused by browser-cached JS bundles.
- **Backend Stability**: Added bypass logic for the `critical-err` session ID to prevent the server from crashing when the UI attempts to load metadata for error log entries.

## 2. Technical State
- **Frontend**: Fully theme-aware React SPA served from `dist/` by the Bun/Hono backend.
- **Backend**: Hono server on port 8080. Manually loads `.env` to ensure environment variable consistency.
- **Authentication**: Using "Strict x-goog-api-key Mode" for all external Jules API calls.
- **Build**: Current production bundle is forced with a unique build timestamp in `src/main.tsx` to invalidate caches.

## 3. Current Focus & Blockers
- **Monitoring**: The system is stable, but we should monitor for any new Google gateway policy changes.
- **Borg Readiness**: The project is now stable and documented enough for assimilation into the Borg ecosystem. The `AQ.A` token protocol is the most critical piece of knowledge to preserve.

## 4. Immediate Next Steps
1.  **Borg Assimilation**: Trigger the Borg assimilation process now that the state is clean and documented.
2.  **Telemetry**: Consider adding real-time telemetry for the 500ms messaging delays to visualize broadcast progress.
3.  **RAG Integration**: Resume work on the `sqlite-vss` integration described in `RAG_ARCHITECTURE.md`.

## 5. Knowledge Nuggets
- **Header Poisoning**: Sending both `Authorization` and `x-goog-api-key` to Jules v1alpha causes a service block.
- **Colon Routing**: Hono requires explicit regex or parameter parsing to handle URLs containing colons (`:`).
- **AQ.A Tokens**: These are not standard API keys; they are high-privilege session principals.
