# Deployment Guide

This guide covers how to deploy Jules UI to Vercel and other platforms.

## Vercel Deployment

Jules UI is optimized for Vercel Serverless Functions.

### Prerequisites

1.  A Vercel account.
2.  Your Jules API Key.
3.  (Optional) OpenAI/Anthropic keys for "Council Debate" features.
4.  (Optional) Turso/LibSQL database URL for persistent settings.

### Steps

1.  **Import Project:**
    *   Go to Vercel Dashboard -> Add New -> Project.
    *   Select your `jules-autopilot` repository.

2.  **Configure Project:**
    *   **Framework Preset:** Next.js
    *   **Root Directory:** `./` (Root)
    *   **Build Command:** `pnpm run build` (This is crucial as it triggers the shared package build).
    *   **Install Command:** `pnpm install` (Vercel should detect this automatically).

3.  **Environment Variables:**
    Add the following variables:

    | Variable | Description | Required |
    | :--- | :--- | :--- |
    | `JULES_API_KEY` | Your primary Jules API key. | Yes |
    | `NEXTAUTH_SECRET` | A random string for session encryption. | Yes |
    | `DATABASE_URL` | URL for database persistence (see below). | No |
    | `TURSO_AUTH_TOKEN` | Auth token if using Turso/LibSQL. | No |
    | `OPENAI_API_KEY` | For Council Debate/Supervisor features. | No |

4.  **Deploy:**
    *   Click **Deploy**.

### Database Persistence

By default, Vercel deployments use an ephemeral SQLite database (`/tmp/dev.db`). This means settings and logs **will be lost** when the serverless function cold starts (frequently).

To enable persistence:

1.  Create a database on [Turso](https://turso.tech/).
2.  Get your Database URL (`libsql://...`) and Auth Token.
3.  Set `DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel.

The application automatically detects the `libsql://` protocol and switches to the remote adapter.

## Docker Deployment

You can also run Jules UI using Docker.

```bash
docker-compose -f deploy/docker-compose.yml up --build -d
```

This will start:
*   The Next.js App (Port 3000)
*   The Terminal Server (Port 3002)
*   A persistent volume for the SQLite database.
