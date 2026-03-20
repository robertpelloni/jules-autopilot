# Jules Autopilot (Lean Core)

> **The ultra-fast, autonomous command center for Google Jules.**

Jules Autopilot is a high-performance, minimalist orchestration platform for the Google Jules AI agent. It replaces slow official interfaces with a unified, real-time dashboard and a keyboard-driven TUI, all powered by a single zero-dependency Bun binary.

## 🚀 The Holy Grail Stack (100% Lean)

This project has been pivoted to a "Lean Core" architecture to ensure maximum performance and zero friction:

- **Runtime:** [Bun](https://bun.sh) (Single binary for everything)
- **Backend:** [Hono](https://hono.dev) (High-performance API + WebSocket server)
- **Frontend:** [Vite](https://vitejs.dev) + [React 19](https://react.dev) (Pure SPA, no SSR overhead)
- **Database:** [Prisma](https://prisma.io) + SQLite (Zero-config local persistence)
- **Queue:** Native SQLite-backed task queue (No Redis required)
- **Styling:** [TailwindCSS v4](https://tailwindcss.com)

## 🛠️ Getting Started

### Prerequisites
- [Bun](https://bun.sh) installed globally.
- [pnpm](https://pnpm.io) for workspace dependency management.

### Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/jules-autopilot.git
cd jules-autopilot

# Install dependencies
pnpm install

# Initialize the database
npx prisma db push
```

### Running the Command Center
You can run the entire stack with two commands:

1. **Start the API Daemon:**
   ```bash
   pnpm run daemon
   ```
2. **Start the Vite Dashboard (Dev Mode):**
   ```bash
   pnpm run dev
   ```

## 🏗️ Architecture (Lean Core)

```
┌──────────────────────────────────────────┐
│          Browser (Vite SPA)              │
│  http://localhost:3000 (Dev)             │
│  http://localhost:8080 (Prod)            │
└───────────────┬──────────────────────────┘
                │ Proxy / WebSocket
                ▼
┌──────────────────────────────────────────┐
│        Bun Daemon (Hono Server)          │
│  • Centralized Jules API Proxy           │
│  • SQLite Task Queue (Background Nudges) │
│  • Local Filesystem Access               │
│  • Multi-Agent Debate Engine             │
└───────────────┬──────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│        SQLite Database (Prisma)          │
│  • Session State & Activity Logs         │
│  • Task Queue Persistence                │
│  • User Settings & Templates             │
└──────────────────────────────────────────┘
```

## 🧪 Operational Commands
- `pnpm run build`: Build the shared package, prisma client, and Vite SPA.
- `pnpm run daemon`: Start the backend API and background monitoring.
- `pnpm run lint`: Run ESLint across the source tree.
- `pnpm run typecheck`: Strict TypeScript validation.

## 📜 License
MIT
