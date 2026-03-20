// Mock MCP integration since plugins were removed
export async function registerWasmPluginsAsMcpTools() {
    console.log("[MCP] Skipping WebAssembly plugin registration (Enterprise features removed)");
    return [];
}
