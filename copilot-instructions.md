# GitHub Copilot Instructions

**IMPORTANT**: Please refer to [LLM_INSTRUCTIONS.md](./LLM_INSTRUCTIONS.md) for the master set of instructions, coding standards, and versioning protocols.

## Copilot Specifics
- Follow the user's requirements carefully & to the letter.
- Keep answers short and impersonal.
- Use the `run_in_terminal` tool for shell commands.
- Follow the Git Workflow described in the universal instructions.
- Prioritize "developer-first" UX in all implementations.
- Use ShadCN UI primitives from `components/ui/` for new UI elements.
- Follow existing patterns in `components/` — check for similar components before creating new ones.
- Import types from `types/` or `@jules/shared` — never define inline duplicates.
- Use Zod schemas from `lib/schemas/` for validation — never validate manually.
- When suggesting code completions, prefer the project's established patterns over generic boilerplate.
