# Universal LLM Instructions

**Version**: 1.1.0
**Last Updated**: 2025-12-30

This document is the **single source of truth** for all AI agents (Claude, Gemini, GPT, Copilot, etc.) working on the Jules UI project.

## 🚨 Critical Protocols

1.  **Safety First**: NEVER run destructive commands (`rm -rf`) without explicit confirmation.
2.  **Git Workflow**:
    *   **Submodules**: Always run `git submodule update --init --recursive` when starting.
    *   **Commits**: Use semantic commit messages (e.g., `feat:`, `fix:`, `chore:`).
    *   **Versioning**: ALWAYS update `VERSION` and `CHANGELOG.md` when completing a significant task.
3.  **No Hallucinations**: Do not invent APIs. Check `lib/` and `types/` for existing code.

## 📂 Project Structure

*   `app/` - Next.js App Router (Pages & API).
*   `components/` - React Components (Shadcn UI).
*   `external/` - **Submodules** (Dependencies).
*   `lib/` - Business Logic (Prisma, Jules Client, Utils).
*   `prisma/` - Database Schema.
*   `public/` - Static Assets.

## 📦 Submodules

| Name | Path | Description |
| :--- | :--- | :--- |
| **Orchestration** | `external/antigravity-jules-orchestration` | Multi-agent debate & complex logic. |
| **MCP Servers** | `external/*-mcp` | Model Context Protocol integrations. |
| **SDK** | `jules-sdk-reference` | Python SDK reference. |

**Rule**: If you need to check a submodule version, look at `docs/SUBMODULES.md` or run `git submodule status`.

## 🛠️ Development Standards

*   **Stack**: Next.js 15, React 19, Tailwind CSS, Prisma (SQLite/LibSQL).
*   **State**: Zustand (`lib/stores`) for client state.
*   **API**: Next.js Route Handlers (`app/api`).
*   **Styles**: Mobile-first, Dark Mode default.

## 📝 Changelog & Versioning

When you complete a task:

1.  Read `VERSION` file.
2.  Increment version (Patch for bugs, Minor for features).
3.  Update `VERSION` file.
4.  Update `package.json` version.
5.  Add entry to `CHANGELOG.md`.
6.  Commit: `chore: bump version to X.Y.Z`.

## 🤖 Agent-Specific Overrides

### Claude
*   Focus on architectural correctness and deep refactoring.
*   Use `Artifacts` for long code blocks.

### Gemini
*   Optimize for speed and concise answers.
*   Check for Google-specific integrations in `external/google-jules-mcp`.

### GPT
*   General purpose coding and logic.
*   Strict adherence to "System Supervisor" role in `app/api/supervisor`.

### Copilot
*   Inline code suggestions.
*   Follow existing patterns in `components/ui`.
