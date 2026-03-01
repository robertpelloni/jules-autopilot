import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchSimilar } from "../lib/api/rag.ts";

export const mcpServer = new McpServer({
    name: "Jules Autopilot RAG Context",
    version: "1.0.0"
});

mcpServer.tool(
    "query_codebase",
    {
        query: z.string().describe("Performs a semantic similarity search across the currently indexed codebase. Input: semantic prompt (e.g., 'How is authentication handled in the frontend?')"),
        top_k: z.number().optional().describe("Number of results to return. Defaults to 5")
    },
    async ({ query, top_k }) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return {
                content: [{ type: "text", text: "Error: OPENAI_API_KEY is not defined in the environment." }]
            };
        }

        try {
            // Generate 1536-dimensional embedding using OpenAI (Fast and Industry Standard)
            const response = await fetch("https://api.openai.com/v1/embeddings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    input: query,
                    model: "text-embedding-3-small"
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.statusText}`);
            }

            const data = await response.json();
            const embedding = data.data[0].embedding;

            const results = await searchSimilar(embedding, top_k || 5);

            if (results.length === 0) {
                return {
                    content: [{ type: "text", text: "No relevant codebase chunks found. Is the repository currently indexed?" }]
                };
            }

            const formattedResults = results.map((r, i) => {
                return `### RAG Search Result ${i + 1} (Similarity: ${(r.score * 100).toFixed(1)}%)\n**File:** \`${r.filePath}\` (Lines ${r.startLine}-${r.endLine})\n\`\`\`\n${r.content}\n\`\`\``;
            }).join("\n\n---\n\n");

            return {
                content: [{ type: "text", text: formattedResults }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error querying codebase vector database: ${error instanceof Error ? error.message : String(error)}` }]
            };
        }
    }
);

/**
 * Dynamically queries the database for installed and active Wasm Plugins
 * and binds them directly into the underlying MCP Tool Registry.
 */
export async function registerWasmPluginsAsMcpTools() {
    console.log("[MCP] Fetching active WebAssembly plugins to mount as tools...");

    // Lazy-import prisma and WasmPluginRunner at runtime to avoid Node 24 ESM loader
    // crashes caused by lib/prisma.ts using CJS require() internally.
    const { prisma } = await import('../lib/prisma.ts');
    const { WasmPluginRunner } = await import('../lib/plugins/wasm-runner.ts');

    const activePlugins = await prisma.pluginManifest.findMany({
        where: {
            status: 'active',
            OR: [
                { wasmPayload: { not: null } },
                { wasmUrl: { not: null } }
            ]
        }
    });

    let toolsMounted = 0;

    for (const manifest of activePlugins) {
        // Zod validation is tough dynamically without 'eval', so we accept generic string payloads.
        // The Plugin author is responsible for parsing JSON inputs from the prompt inside the Wasm Guest.
        if (manifest.capabilities.includes('mcp:invoke_tool')) {
            try {
                // If the plugin declares configSchema, we could theoretically build a Zod object dynamically.
                // For the zero-trust architecture MVP, we simply send a raw text instruction.
                mcpServer.tool(
                    manifest.id,
                    {
                        input: z.string().describe(manifest.description || `Input payload or command for the ${manifest.name} plugin to process.`)
                    },
                    async ({ input }) => {
                        try {
                            // Instantiate the sandbox per-request. Extism initializes in ~1ms
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const runner = new WasmPluginRunner(manifest as any);

                            // Execute a presumed 'run' or 'execute' function inside the Guest Wasm
                            const result = await runner.execute('run', input);

                            if (result.success) {
                                return {
                                    content: [{ type: "text", text: result.output || 'Execution completed with no output.' }]
                                };
                            } else {
                                return {
                                    content: [{ type: "text", text: `Plugin Execution Failed: ${result.error}` }]
                                };
                            }
                        } catch (err) {
                            return {
                                content: [{ type: "text", text: `Sandbox Fault: ${err instanceof Error ? err.message : String(err)}` }]
                            };
                        }
                    }
                );
                toolsMounted++;
                console.log(`[MCP] Mounted secure Wasm Tool: ${manifest.id} (${manifest.version})`);
            } catch (err) {
                console.error(`[MCP] Failed to mount tool for plugin ${manifest.id}:`, err);
            }
        }
    }
    console.log(`[MCP] Ready. Isolated ${toolsMounted} Wasm Plugins.`);
}
