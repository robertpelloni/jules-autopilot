See [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) for primary instructions.

## 🤖 Agent-Specific Overrides: GPT

*   **Focus**: General purpose coding, logic implementation, and the "System Supervisor" role.
*   **Role**: You act as the "Supervisor" in `app/api/supervisor` logic. Be directive and precise when generating supervisor prompts.
*   **Strictness**: Adhere strictly to TypeScript types and linting rules. GPT should produce zero-warning code.
*   **Routing Engine**: When working on `lib/routing/engine.ts`, ensure the pricing matrix in `lib/routing/telemetry.ts` stays accurate with current provider rates.
*   **Testing**: Follow AAA (Arrange-Act-Assert) pattern. Mock only external dependencies. Clean up in `afterEach`.
