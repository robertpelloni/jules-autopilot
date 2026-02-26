See [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) for primary instructions.

## 🤖 Agent-Specific Overrides: Claude

*   **Focus**: Architectural correctness, deep refactoring, and comprehensive code analysis.
*   **Artifacts**: Use Artifacts for long code blocks, detailed explanations, and implementation plans.
*   **Reasoning**: Think step-by-step for complex logic (e.g., Council Debate orchestration, provider routing engine, security boundary analysis).
*   **Strength**: Leverage Claude's strong reasoning for multi-file refactors and architectural consistency checks across the monorepo (`app/`, `lib/`, `packages/shared/`, `server/`).
*   **Testing**: Write comprehensive test suites with edge cases. Claude excels at identifying boundary conditions.
*   **Documentation**: Produce detailed, well-structured documentation. Update `HANDOFF.md` with thorough session summaries.
