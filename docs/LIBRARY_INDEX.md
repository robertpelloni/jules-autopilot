# Universal Library & Function Index

*Generated: 2026-01-09*  
*Version: 0.7.1*

---

## Table of Contents

- [Submodules](#submodules)
  - [Jules Integration & Orchestration](#jules-integration--orchestration)
  - [MCP Servers](#mcp-servers)
  - [GitHub Integration](#github-integration)
  - [Documentation & Prompts](#documentation--prompts)
- [Key Libraries](#key-libraries)
  - [UI & Animation Libraries](#ui--animation-libraries)
  - [State Management](#state-management)
  - [Database & Storage](#database--storage)
  - [Real-time Communication](#real-time-communication)

---

## Submodules

### Jules Integration & Orchestration

#### 1. **antigravity-jules-orchestration**
*(https://github.com/Scarmonit/antigravity-jules-orchestration)*

**Core Functionality:**
- Autonomous AI orchestration architecture combining **Google Antigravity** with **Jules API** for hands-free development workflows.
- Leverages Model Context Protocol (MCP) for seamless agent coordination.
- **65 MCP tools** across multiple categories: Jules Core API, Session Management, Session Templates, PR Integration, Session Queue, Batch Processing, Analytics, Monitoring & Cache, Ollama Local LLM, RAG, Semantic Memory, Render Integration, Suggested Tasks.

**Why Selected:**
- Provides **comprehensive AI orchestration layer** beyond simple Jules API integration.
- Enables multi-agent workflows with browser automation and coding tasks.
- Latest version (2.6.2) includes advanced features like Render Auto-Fix and Semantic Memory Integration.

---

#### 2. **gemini-cli-jules**
*(https://github.com/gemini-cli-extensions/jules)*

**Core Functionality:**
- Gemini CLI extension enabling coding task delegation directly from the terminal.
- Supports bug fixing, refactoring, and documentation maintenance in the background.

**Why Selected:**
- Terminal-based workflow aligns with the "Command Center" philosophy.
- Enables **async task delegation** without blocking the main terminal session.

---

### MCP Servers

#### 3. **google-jules-mcp**
*(https://github.com/samihalawa/google-jules-mcp)*

**Core Functionality:**
- MCP server for automating Google Jules with **5 session management modes**: fresh, chrome-profile, cookies, persistent, browserbase.
- Supports cloud deployments via Browserbase.

**Why Selected:**
- Most **comprehensive session management** with multiple authentication modes.
- Screenshot support and browser automation for complex debugging.

---

#### 4. **jules-mcp-server**
*(https://github.com/CodeAgentBridge/jules-mcp-server)*

**Core Functionality:**
- FastMCP framework exposing Jules Agent operations.
- Stateless architecture optimized for compatibility with multiple MCP clients (Cursor, Claude Desktop).

**Why Selected:**
- Optimized for **stateless compatibility** and clean architecture.
- Type-safe validation using Joi schemas.

---

### GitHub Integration

#### 5. **jules-action**
*(https://github.com/google-labs-code/jules-action)*

**Core Functionality:**
- GitHub Action that triggers the Jules agent from GitHub events (issues, PRs, schedules).
- Powered by Gemini 3 Pro.

**Why Selected:**
- **Native GitHub integration** for automated CI/CD and bot-driven refactoring.
- Measurable targets (e.g., "Open PR only if performance improves by 20%").

---

#### 6. **jules-task-queue**
*(https://github.com/iHildy/jules-task-queue)*

**Core Functionality:**
- Solves the Jules "3 concurrent task" bottleneck by automatically queuing tasks.
- Label-based automation (`jules` and `jules-queue`).

**Why Selected:**
- Transforms Jules into a "set it and forget it" automation tool.
- **Intelligent retry logic** ensures 100% daily quota utilization.

---

### Documentation & Prompts

#### 7. **jules-awesome-list**
*(https://github.com/google-labs-code/jules-awesome-list)*

**Core Functionality:**
- Curated collection of effective prompts categorized by task (Debugging, Testing, etc.).

**Why Selected:**
- **Highest community engagement** (2700+ stars).
- Reduces trial-and-error for complex agent instructions.

---

## Key Libraries (Available for Integration)

| Library | Status | Recommendation |
|---------|--------|----------------|
| **@tanstack/react-virtual** | Available | Use for Activity Feed & Session History virtualization. |
| **dnd-kit** | Available | Use for Kanban board & reorderable lists. |
| **zustand** | Not Yet Installed | Recommended for global application state & filters. |
| **framer-motion** | Not Yet Installed | Recommended for micro-interactions & smooth transitions. |
| **socket.io-client** | **Active** | Used for real-time Terminal and Activity streaming. |
| **libsql/client** | **Active** | Used via Prisma for local SQLite database. |

---
