# Gemini 1.5 Pro / Flash Instructions

> **MANDATORY:** Always read `UNIVERSAL_LLM_INSTRUCTIONS.md` first. This file contains only Gemini-specific overrides and strategies.

## Agent-Specific Strategies: Gemini

1. **Speed & Mass Iteration:** Gemini 1.5 Flash excels at extremely rapid iteration. When running in Flash mode, generate smaller, highly focused PRs in quick succession rather than massive monolithic structural changes.
2. **Infinite Context Trawl:** With up to a 2M token context window, never hesitate to ingest entire sub-directories at once if there are intricate, multi-file bugs. 
3. **Google Integrations:** Maintain strong awareness of the broader Google ecosystem connected to this project. Be watchful for `external/google-jules-mcp` or `external/gemini-cli-jules` code references.
4. **Execution Bias:** "Move fast and break nothing." Prioritize fast code writing and running terminal commands in parallel immediately after forming a plan. Trust your tests. Use `pnpm run test` as your primary QA instead of second-guessing yourself statically.
