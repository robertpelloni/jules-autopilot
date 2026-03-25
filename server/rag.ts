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

    // 2. Fetch Code Chunks and Memory Chunks in parallel
    const [codeChunks, memoryChunks] = await Promise.all([
        prisma.codeChunk.findMany({
            select: { id: true, filepath: true, startLine: true, endLine: true, content: true, embedding: true }
        }),
        prisma.memoryChunk.findMany({
            select: { id: true, sessionId: true, type: true, content: true, embedding: true }
        })
    ]);

    // 3. Compute similarities for Code
    const scoredCode = codeChunks.map(chunk => {
        let score = 0;
        if (chunk.embedding) {
            const chunkFloatArray = new Float32Array(chunk.embedding.buffer, chunk.embedding.byteOffset, chunk.embedding.byteLength / Float32Array.BYTES_PER_ELEMENT);
            score = cosineSimilarity(queryEmbedding, chunkFloatArray);
        }
        return { ...chunk, score, origin: 'codebase' as const };
    });

    // 4. Compute similarities for Memory
    const scoredMemory = memoryChunks.map(chunk => {
        let score = 0;
        if (chunk.embedding) {
            const chunkFloatArray = new Float32Array(chunk.embedding.buffer, chunk.embedding.byteOffset, chunk.embedding.byteLength / Float32Array.BYTES_PER_ELEMENT);
            score = cosineSimilarity(queryEmbedding, chunkFloatArray);
        }
        return { ...chunk, score, origin: 'history' as const };
    });

    // 5. Combine, Sort and return top K
    const allResults = [...scoredCode, ...scoredMemory];
    allResults.sort((a, b) => b.score - a.score);

    return allResults.slice(0, topK).map(c => ({
        filepath: 'filepath' in c ? c.filepath : `session:${c.sessionId}`,
        startLine: 'startLine' in c ? c.startLine : 0,
        endLine: 'endLine' in c ? c.endLine : 0,
        content: c.content,
        score: c.score,
        origin: c.origin
    }));
}
