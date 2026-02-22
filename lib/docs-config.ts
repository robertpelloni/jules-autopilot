export interface DocSection {
    title: string;
    items: DocItem[];
}

export interface DocItem {
    title: string;
    slug: string;
    filePath: string;
    description?: string;
}

export const DOCS_CONFIG: DocSection[] = [
    {
        title: "Getting Started",
        items: [
            { title: "Introduction", slug: "intro", filePath: "README.md", description: "Overview of Jules UI" },
            { title: "User Guide", slug: "user-guide", filePath: "docs/USER_GUIDE.md", description: "Comprehensive user manual" },
            { title: "Roadmap", slug: "roadmap", filePath: "ROADMAP.md", description: "Project status and future plans" },
            { title: "Changelog", slug: "changelog", filePath: "CHANGELOG.md", description: "Recent updates and changes" },
        ]
    },
    {
        title: "Core Concepts",
        items: [
            { title: "Agents & Instructions", slug: "agents", filePath: "AGENTS.md", description: "Agent behavior and configuration" },
            { title: "LLM Instructions", slug: "llm-instructions", filePath: "LLM_INSTRUCTIONS.md", description: "Universal instructions for LLMs" },
            { title: "Architecture", slug: "architecture", filePath: "docs/ARCHITECTURE.md", description: "System design and structure" },
            { title: "Vision", slug: "vision", filePath: "docs/VISION.md", description: "Long-term goals and philosophy" },
        ]
    },
    {
        title: "Reference",
        items: [
            { title: "API Reference", slug: "api", filePath: "docs/API_REFERENCE.md", description: "Jules API endpoints" },
            { title: "Terminal", slug: "terminal", filePath: "docs/TERMINAL.md", description: "Integrated terminal usage" },
            { title: "Submodules", slug: "submodules", filePath: "docs/SUBMODULES.md", description: "External module integration" },
        ]
    }
];
