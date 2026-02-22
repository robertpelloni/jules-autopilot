# Submodule Directory

This project (`jules-autopilot`, a.k.a Jules UI) acts as the aggregator and command center for a multi-agent ecosystem. These agents and their orchestrations are linked into this repository as git submodules.

All submodules are located in the `external/` directory, except for `jules-sdk-reference`.

| Submodule Name | Path | Description |
| :--- | :--- | :--- |
| **Antigravity Orchestration** | `external/antigravity-jules-orchestration` | High-level orchestration for Antigravity (Browser automation) and Jules workflows. Acts as the `agent.scarmonit.com` bridge logic. |
| **Gemini CLI** | `external/gemini-cli-jules` | Command Line Interface extensions for invoking and managing Gemini agents. |
| **Google Jules MCP** | `external/google-jules-mcp` | Specific Google integrations for the Model Context Protocol (MCP). |
| **Jules Action** | `external/jules-action` | GitHub Action integration for automating Jules tasks within CI/CD pipelines. |
| **Jules Awesome List** | `external/jules-awesome-list` | Curated list of awesome tools, integrations, and resources for the Jules ecosystem. |
| **Jules MCP Server (Node)** | `external/jules-mcp-server` | Standard Node.js implementation of the Model Context Protocol for Jules. |
| **Jules MCP (Python)** | `external/jules_mcp` | Python implementation of the Model Context Protocol for Jules. |
| **Jules System Prompt** | `external/jules-system-prompt` | The core, optimized system prompts and overarching instruction sets used to initialize the agents. |
| **Jules Task Queue** | `external/jules-task-queue` | The enterprise-grade background queue (often Vercel/Firebase deployed) designed to circumvent the 3-concurrent task limit of Jules AI. |
| **Jules SDK Reference** | `jules-sdk-reference` | The primary Python SDK reference for interacting programmatically with Jules. |

## Updating Submodules

When instructed to update submodules, agents must run the following from the root:
```bash
git submodule update --remote --merge
```
After verifying changes, add and commit the updated pointers in the main repository.

## Submodule Architecture within the UI
Currently, the UI aggregates status signals from these submodules. Future phases (`ROADMAP.md` Phase 4) intend to build proper management dashboards to install, start, and monitor these local submodules directly from the browser via the Bun Daemon.
