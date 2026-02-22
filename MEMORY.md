# Context & Memory

This file serves as a persistent memory bank for AI agents to document observations, debugging gotchas, and specific repository design patterns that aren't documented in normal README files.

## Architectural Truths (Feb 2026)
- **Split Brain Avoidance**: We have a Next.js App Router (HTTP/API) AND a Bun/Hono Daemon (WebSocket + specialized tasks) at `server/index.ts`. Avoid duplicating business logic between them. If logic must be shared, pull it into `@jules/shared` workspace package.
- **Port 8080 conflicts**: The Daemon specifically binds to 8080. If it crashes, `PID` locking is common. You must run `netstat -ano | findstr :8080` (or `lsof -i:8080`) to kill stale instances before restarting.
- **Prisma SQLite**: We use LibSQL via Prisma (`@prisma/adapter-libsql`). Any schema changes require `npx prisma db push` (not `prisma migrate dev` due to the rapid prototyping setup currently in use). Make sure `.env` contains `DATABASE_URL="file:./dev.db"`.
- **SearchCommandDialog Accessibility**: Radix dialogs strictly enforce having a `DialogTitle`. If adding a command menu, always include `<DialogTitle className="sr-only">Title</DialogTitle>` to prevent screen-reader errors.

## Agent Execution Guidelines for Jules-Autopilot
- **Frontend vs Backend errors**: Do not confuse Next.js router fetch errors with Bun Daemon fetch errors.
- **Submodule awareness**: When editing a file, verify if it belongs to an `external/*` submodule. If it does, commit it in the submodule first, then commit the pointer update in the main repository.
