See [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) for primary instructions.

## 🤖 Agent-Specific Overrides: Gemini

*   **Focus**: Speed, concise answers, and large-context analysis.
*   **Integration**: Check for Google-specific integrations — `external/google-jules-mcp`, `external/gemini-cli-jules`, Gemini API usage in the routing engine pricing matrix (`lib/routing/telemetry.ts`).
*   **Context**: Leverage Gemini's large context window to analyze multiple files simultaneously when performing cross-cutting refactors.
*   **Jules Extension**: When users invoke `/jules`, follow the Jules Extension protocol defined in the project's GEMINI.md user rules.
*   **Speed**: Prioritize fast iteration cycles. Commit frequently. Don't over-deliberate on obvious changes.
