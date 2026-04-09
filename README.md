# Jules UI

![Build Status](https://github.com/robertpelloni/jules-autopilot/actions/workflows/ci.yml/badge.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)

**A powerful, self-hosted workspace for Google's Jules AI agent.**

Transform standard agent interactions into an engineering command center with live code diffs, real-time activity monitoring, session analytics, and comprehensive terminal output inspection.

## ✨ Key Features

- 🔄 **Real-Time Updates** - Live activity feed with auto-polling.
- 🤖 **Auto-Pilot (Session Keeper)** - Keep sessions active automatically with smart nudges and plan approvals.
- ⚖️ **Council Debate Mode** - Multi-agent debate system (Architect vs Security) to guide the primary agent.
- 🛡️ **Deep Code Analysis** - Parallel code audits for Security, Performance, and Maintainability.
- 📊 **Code Diff Viewer** - Visualize git patches and changes instantly.
- 📁 **Artifact Browser** - Browse and review generated files (diffs, logs, media) with one click.
- 💻 **Integrated Terminal** - Full web-based terminal with local machine access.
- 📈 **Analytics Dashboard** - Track session metrics and trends.
- ⚙️ **System Dashboard** - View submodules, build versions, and project structure.

## 🚀 Quick Start

### Prerequisites

*   **Node.js 18+** (Node 20+ recommended)
*   **pnpm** (Required for workspace management)
*   **Jules API Key**

### Option 1: Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/robertpelloni/jules-autopilot.git
    cd jules-autopilot
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Start the development server:**
    ```bash
    pnpm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

### Option 2: Vercel Deployment

Click the button below to deploy your own instance of Jules UI to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frobertpelloni%2Fjules-autopilot)

**Important:** This project uses `pnpm`. Vercel should automatically detect `pnpm-lock.yaml` and use it.

See [docs/DEPLOY.md](docs/DEPLOY.md) for detailed deployment instructions.

## 🛠️ Architecture

This project is a **monorepo workspace** optimized for both local (Bun) and cloud (Node.js) environments.

*   `packages/shared`: Shared business logic, types, and orchestration.
*   `app/`: Main Next.js application (Frontend + API Routes).
*   `server/`: Background Session Keeper daemon.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive.

## 📚 Documentation

*   [Deployment Guide](docs/DEPLOY.md)
*   [Architecture Overview](docs/ARCHITECTURE.md)
*   [API Reference](docs/API_REFERENCE.md)

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
