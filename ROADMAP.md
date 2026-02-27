# Project Roadmap

This roadmap outlines the major structural plans and strategic milestones for the Jules Autopilot Orchestrator. 
For granular tasks and immediate bug fixes, see `TODO.md` and `task.md`.

## Milestone: v0.9 (Current) — "Enterprise Foundations"
* [x] **Agent Routing & Telemetry:** Dynamic Provider routing (OpenAI vs Anthropic) based on cost and quota caps.
* [x] **Submodule Architecture:** Consolidation of 10 external plugins and MCP tools (Orchestrators, CLI, GitHub Actions).
* [x] **UI Polish:** Granular plugin signature tracking, live budget dashboards, SSE real-time push events.
* [x] **Docker Portability:** Production-hardened containerization with Vercel/Firebase fallback support.

## Milestone: v1.0 — "The Swarm"
* [ ] **Distributed Orchestration:** Migration from standalone Node instances to native distributed Redis queues (BullMQ/Kafka).
* [x] **RAG Context Mesh:** Deep semantic search vector stores embedded natively to provide instantaneous codebase familiarity to fresh agents. *(See `RAG_ARCHITECTURE.md` for v1.1.0 implementation path)*
* [ ] **IDE Integration:** Official VS Code and JetBrains extension bridges allowing the orchestration core to control a developer's local IDE natively.

## Milestone: v1.5 — "Shadow Pilot"
* [ ] **Background Anomaly Detection:** Agents silently monitoring `git diffs` background tasks, fixing failing CI pipelines before human review.
* [ ] **WebAssembly Plugin Isolation:** Absolute zero-trust security architecture enforcing memory ceilings on external MCP tool capabilities locally.
