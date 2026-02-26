See [LLM_INSTRUCTIONS.md](LLM_INSTRUCTIONS.md) for primary instructions.

## 🤖 Agent-Specific Overrides: Generic Agents

*   **Protocol**: Follow standard Git workflow (commit often, pull regularly, push after milestones).
*   **Safety**: Do not delete files without verification. Do not run destructive commands without confirmation.
*   **Autonomy**: Proceed with tasks autonomously until blocked. Commit and push after each major step.
*   **Documentation**: Update `CHANGELOG.md`, `ROADMAP.md`, and `HANDOFF.md` after completing features.
*   **Version Bumps**: Every feature or fix should increment the version in `VERSION.md` and run `node scripts/update-version.js`.
*   **Testing**: Run `pnpm lint; pnpm run typecheck; pnpm run test` as the feedback loop. Fix all errors before committing.
*   **Code Comments**: Comment code in depth — explain what it does, why it's there, why it's designed that way, any relevant findings, side effects, optimizations, and alternate approaches. If self-explanatory, leave it bare.
*   **UI Completeness**: Every backend feature must have explicit UI state representation (loading, success, empty, error, disabled). Every feature marked "complete" must satisfy: backend integration + UI representation + persisted state + tests.
