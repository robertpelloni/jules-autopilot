# Architectural Memory & Codebase Observations

*This document is maintained autonomously by LLM agents to explicitly pass implicit codebase context to future sessions.*

## 1. The Verified Portal Auth Strategy
**Critical Discovery:** Jules Portal tokens (starting with `AQ.A...`) are rejected by the Google gateway if sent via standard `Authorization: Bearer` headers. 
**Enforcement:** We must strictly use the `x-goog-api-key` header and **EXPLICITLY DELETE** the `Authorization` header from the request object. Failing to do so triggers an `API_KEY_SERVICE_BLOCKED` error.

## 2. Hono Custom Method Routing
**Discovery:** Hono paths containing colons (e.g., `/sessions/123:sendMessage`) do not always match standard parameter handlers.
**Solution:** We implement a catch-all `:idAndAction` parameter and manually split the string by the colon. This ensures custom gRPC-style actions are correctly routed to their handlers in `server/index.ts`.

## 3. Lean Core Persistence (SQLite)
**Observation:** We have replaced Redis, BullMQ, and specialized Vector DBs with a single, high-performance SQLite database.
**Context:**
- **Queue**: Managed via the `QueueJob` table and a continuous polling loop in `server/queue.ts`.
- **RAG**: Chunks and embeddings are stored in `CodeChunk` and `MemoryChunk` tables. 
- **Performance**: In-memory cosine similarity search across ~5,000 chunks takes <50ms, making it faster and cheaper than cloud-only vector solutions for this node size.

## 4. Frontend Resilience & Performance
**Observation:** Vite aggressively caches JS bundles.
**Fix:** We use a `Build: [Timestamp]` string in `src/main.tsx` to force hash refreshes.
**Live Data:** We utilize **SWR** for high-frequency polling of system metadata (like submodule status), ensuring the UI reflects the Git state without manual refreshes.

## 5. UI Readability Standards
**Requirement:** The session chat history must remain high-contrast.
**Rules:**
- Use **solid backgrounds** (`bg-zinc-900`) for agent bubbles.
- Forced text color: `zinc-100` for all chat content.
- Base font size for chat: `16px` (`text-base`).
- Use the **Sparkles badge** to indicate repository context in the header.
