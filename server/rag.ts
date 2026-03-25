import { prisma } from '../lib/prisma';

function cosineSimilarity(A: Float32Array, B: Float32Array) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < A.length; i++) {
        dotProduct += A[i] * B[i];
        normA += A[i] * A[i];
        normB += B[i] * B[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function queryCodebase(query: string, apiKey: string, topK: number = 5) {
    if (!apiKey) throw new Error("API Key required for RAG querying.");

    // 1. Embed the query
    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ input: query, model: "text-embedding-3-small" })
    });

    if (!response.ok) {
        throw new Error("Failed to generate embedding for query.");
    }

    const data = await response.json();
    const queryEmbedding = new Float32Array(data.data[0].embedding);

    // 2. Fetch all chunks
    // Note: For a real production app with millions of lines, we'd use a real vector DB extension.
    // Since this is SQLite and a local codebase, in-memory cosine similarity across a few thousand chunks is extremely fast (<50ms).
    const chunks = await prisma.codeChunk.findMany({
        select: {
            id: true,
            filepath: true,
            startLine: true,
            endLine: true,
            content: true,
            embedding: true
        }
    });

    if (chunks.length === 0) {
        return [];
    }

    // 3. Compute similarities
    const scoredChunks = chunks.map(chunk => {
        let score = 0;
        if (chunk.embedding) {
            const chunkFloatArray = new Float32Array(chunk.embedding.buffer, chunk.embedding.byteOffset, chunk.embedding.byteLength / Float32Array.BYTES_PER_ELEMENT);
            score = cosineSimilarity(queryEmbedding, chunkFloatArray);
        }
        return { ...chunk, score };
    });

    // 4. Sort and return top K
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK).map(c => ({
        filepath: c.filepath,
        startLine: c.startLine,
        endLine: c.endLine,
        content: c.content,
        score: c.score
    }));
}
