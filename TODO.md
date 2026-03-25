# Development TODOs (v1.0.0 -> v1.1.0)

This document tracks granular bugs, missing features, and technical debt. For epic-level milestones, see `ROADMAP.md`.

## Immediate Actions
- [ ] **Submodule Dashboard Live Data:** The `/dashboard/submodules` page was added, but the backend `scripts/get-submodule-info.js` needs to be triggered reliably or we need an API endpoint to parse the `.git` metadata natively so the UI isn't relying on a static JSON file.
- [ ] **Daemon Split-Brain Finalization:** We built the proxy layer (`lib/api/daemon-proxy.ts`), but we need to audit the frontend Code Editor and Submodule Editor components to ensure they exclusively call `/api/daemon` Next.js routes rather than hardcoded `localhost:8080`.
- [ ] **SSE Streaming Hardening:** The `useEventStream` hook is working, but it needs to be injected into the `SessionView` component so that keeper logs stream in real-time instead of polling.
- [ ] **Borg Dashboard:** Integrate a dedicated UI tab to visualize the Borg manifest and webhook incoming traffic logs.

## Technical Debt & Refactoring
- [ ] **Prisma Connection Pooling:** For production Docker deployments, we are using the default Prisma SQLite connector. We need to evaluate connection pooling limits when concurrency scales up.
- [ ] **Types Extraction:** There are several duplicated types between the frontend App router and the `server/index.ts` daemon. Extract all types strictly to `types/jules.d.ts` or a shared `packages/` workspace.
- [ ] **Vector Search Optimization:** Transition from in-memory cosine similarity array filtering to a dedicated vector extension like `sqlite-vss` or a separate vector database if the chunk count exceeds 50,000 to maintain RAG performance.

## Future Exploration
- [ ] **IDEAS.md Execution:** Review the `IDEAS.md` document and begin migrating the "Visual/UI Regression Testing Agent" and "Decentralized Storage" concepts into formal architectural designs.
