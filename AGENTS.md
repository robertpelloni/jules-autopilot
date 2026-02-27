# Multi-Agent Symphony & Orchestration Protocols

> **MANDATORY:** All agents reading this must also integrate the rules defined in `UNIVERSAL_LLM_INSTRUCTIONS.md`.

## The "Symphony" Architecture

The Jules Autopilot project relies on multiple autonomous LLMs (Claude, Gemini, GPT) working concurrently or sequentially on different aspects of the codebase.

### Agent Roles & Workflows

#### 1. The Architect (Typically Claude 3.5 Opus/Sonnet)
- **Domain:** `ROADMAP.md`, `IMPLEMENTATION_PLAN.md`, global state directories.
- **Responsibility:** Ingest massive context, design REST API boundaries, define Prisma schemas, and orchestrate the overall breakdown of epic tickets into granular checklist items in `task.md`.

#### 2. The Engineer (Typically Gemini 1.5 Pro/Flash)
- **Domain:** `app/`, `components/`, `lib/`
- **Responsibility:** Execute the checklist provided by the Architect at high speeds. Write React components, bind APIs, and aggressively iterate through `pnpm run typecheck` output until the feature builds flawlessly.

#### 3. The Auditor (Typically GPT-4o)
- **Domain:** `tests/`, `.github/`, security auditing.
- **Responsibility:** Performs strict AST/Pattern searches. Writes isolated Jest/Vitest harnesses. Scans the codebase for loose `any` types or uncaught edge-cases and submits patch reviews.

### Handoff Protocol
When an agent reaches its context limit or finishes its domain tasks, it MUST write a comprehensive update to `HANDOFF.md` and clearly update the internal checklist in `task.md` (`[x]` for finished, `[/]` for active) so the next agent inheriting the process can seamlessly spin up its task context loop.
