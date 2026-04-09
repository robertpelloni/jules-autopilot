# Universal LLM Instructions

**Version**: 2.0.0
**Last Updated**: 2026-02-04

This document is the **single source of truth** for all AI agents (Claude, Gemini, GPT, Copilot, etc.) working on the Jules UI project.

## 🚨 Critical Protocols

1.  **Safety First**: NEVER run destructive commands (`rm -rf`) without explicit confirmation.
2.  **Git Workflow**:
    *   **Submodules**: Always run `git submodule update --init --recursive` when starting.
    *   **Commits**: Use semantic commit messages (e.g., `feat:`, `fix:`, `chore:`).
    *   **Versioning**: ALWAYS update `VERSION.md` as the source of truth, then run `npm run update-version` or `node scripts/update-version.js` to sync `package.json` and `lib/version.ts`.
    *   **Feature Branches**: Merge local feature branches into `main` regularly.
3.  **No Hallucinations**: Do not invent APIs. Check `lib/` and `types/` for existing code.
4.  **Autonomy**:
    *   Proceed with tasks autonomously.
    *   Commit and push after each major step.
    *   Do not pause for confirmation unless absolutely necessary.
5.  **Documentation**:
    *   Keep `ROADMAP.md` and `CHANGELOG.md` updated.
    *   Document all new submodules in `docs/SUBMODULES.md` (or the System Dashboard).

## 📂 Project Structure

*   `app/` - Next.js App Router (Pages & API).
*   `components/` - React Components (Shadcn UI).
*   `external/` - **Submodules** (Dependencies).
*   `lib/` - Business Logic (Prisma, Jules Client, Utils).
*   `packages/` - Monorepo workspace packages.
*   `prisma/` - Database Schema.
*   `public/` - Static Assets.
*   `scripts/` - Maintenance and build scripts.
*   `server/` - Standalone Bun/Hono server (Session Keeper Daemon).

## 📦 Submodules

| Name | Path | Description |
| :--- | :--- | :--- |
| **Orchestration** | `external/antigravity-jules-orchestration` | Multi-agent debate & complex logic. |
| **MCP Servers** | `external/*-mcp` | Model Context Protocol integrations. |
| **SDK** | `jules-sdk-reference` | Python SDK reference. |

**Rule**: If you need to check a submodule version, look at `app/system/internals` or run `git submodule status`.

## 🛠️ Development Standards

*   **Stack**: Next.js 16, React 19, Tailwind CSS, Prisma (SQLite/LibSQL).
*   **Package Manager**: **pnpm** (Workspace root).
*   **State**: Zustand (`lib/stores`) for client state.
*   **API**: Next.js Route Handlers (`app/api`).
*   **Backend**: Bun + Hono (`server/`).
*   **Styles**: Mobile-first, Dark Mode default.

## 📝 Changelog & Versioning

When you complete a task:

1.  Read `VERSION.md` file.
2.  Increment version (Patch for bugs, Minor for features).
3.  Update `VERSION.md` file.
4.  Run `node scripts/update-version.js`.
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
