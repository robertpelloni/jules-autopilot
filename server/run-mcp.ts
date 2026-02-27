import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mcpServer } from "./mcp.js"; // Note: .js extension for runtime compatibility

async function main() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("Jules Autopilot RAG MCP Server running on stdio");
}

main().catch((err) => {
    console.error("Fatal error starting MCP Server:", err);
    process.exit(1);
});
