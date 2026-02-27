import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchSimilar } from "../lib/api/rag.ts";

export const mcpServer = new McpServer({
    name: "Jules Autopilot RAG Context",
    version: "1.0.0"
});

mcpServer.tool("query_codebase",
    "Performs a semantic similarity search across the currently indexed codebase to find relevant code patterns or implementations.",
    {
        query: z.string().describe("The semantic prompt (e.g., 'How is authentication handled in the frontend?')"),
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
