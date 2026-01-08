# EXTERNAL MODULES KNOWLEDGE BASE

## OVERVIEW
This directory contains Git Submodules that integrate external functionality into Jules. These are standalone repositories tracked at specific commits.

## STRUCTURE
```
external/
├── antigravity-jules-orchestration/  # Multi-agent orchestration engine & debate logic
├── gemini-cli-jules/                 # CLI extensions for Gemini
├── google-jules-mcp/                 # Google-specific MCP server implementation
├── jules-action/                     # GitHub Actions for Jules automation
├── jules-awesome-list/               # Curated list of prompts and resources
├── jules-mcp-server/                 # Core MCP server
├── jules-system-prompt/              # Standard system prompts for agents
├── jules-task-queue/                 # Background task processing
└── jules_mcp/                        # Alternative MCP implementation
```

## CONVENTIONS
- **Read-Only**: Treat these directories as read-only in the context of the main project.
- **Updates**: Use `git submodule update --remote` to fetch changes, then commit the pointer update in the main repo.
- **Modifications**: If you need to modify a submodule:
    1. Fork the submodule repo.
    2. Update `.gitmodules` to point to your fork.
    3. Make changes in the submodule.
    4. Push to the fork.
    5. Update the main repo to point to the new commit.

## ANTI-PATTERNS
- **Direct Commits**: Never try to commit directly to `external/` subdirectories without proper upstream permissions.
- **Drift**: Avoid letting submodules fall too far behind main if they provide critical functionality.
