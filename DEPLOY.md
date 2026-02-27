# Deployment Guide

The Jules Autopilot project consists of two core components:
1. **Next.js Web Frontend** (App Router — port 3000).
2. **Terminal Server** (Node.js + node-pty + Socket.io — port 8080).

---

## 1. Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Setup SQLite Database
npx prisma db push

# 3. Start Frontend
pnpm dev

# 4. (Optional) Start Terminal Server
cd terminal-server && npm start
```

---

## 2. Docker Deployment (Recommended for Full Features)

### Quick Start

```bash
# Development
cd deploy
docker compose up --build

# Production
cd deploy
docker compose -f docker-compose.prod.yml up --build -d
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required for Production:**
| Variable | Description |
|---|---|
| `NEXTAUTH_SECRET` | Random 32+ char string for session encryption |
| `NEXTAUTH_URL` | Public URL (e.g., `https://jules.yoursite.com`) |

**Optional (enhance functionality):**
| Variable | Description |
|---|---|
| `GITHUB_ID` / `GITHUB_SECRET` | OAuth app credentials for GitHub login |
| `JULES_API_KEY` | Jules API key for session management |
| `OPENAI_API_KEY` | OpenAI provider for LLM routing |
| `ANTHROPIC_API_KEY` | Anthropic provider for LLM routing |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini provider for LLM routing |

### Architecture

```
┌──────────────────────────────────┐
│        docker compose            │
│                                  │
│  ┌────────────┐  ┌────────────┐  │
│  │  jules-ui   │  │ terminal   │  │
│  │  (Next.js)  │→ │  server    │  │
│  │  :3000      │  │  :8080     │  │
│  └──────┬──────┘  └────────────┘  │
│         │                         │
│    ┌────┴─────┐                   │
│    │ SQLite   │                   │
│    │ (Prisma) │                   │
│    └──────────┘                   │
└──────────────────────────────────┘
```

### Health Check

The production container includes a built-in health check hitting `/api/system/status`.

```bash
docker inspect --format='{{.State.Health.Status}}' <container_id>
```

---

## 3. Vercel Deployment (Frontend Only)

The Next.js frontend is optimized for Vercel.

### Prerequisites
- Add `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and provider API keys to Vercel Environment Variables.
- The background *Session Keeper Daemon* **will not run** on Vercel (serverless). Host it separately if needed.

### Steps
1. Push code to GitHub.
2. Import the project in Vercel.
3. Build Command: `pnpm run build:all`
4. Deploy.
