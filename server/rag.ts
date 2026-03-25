import { prisma } from '../lib/prisma';

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i]! * b[i]!;
        mA += a[i]! * a[i]!;
        mB += b[i]! * b[i]!;
    }
    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    return dotProduct / (mA * mB);
}

export async function queryCodebase(query: string, topK: number = 5) {
    const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
    const apiKey = process.env.OPENAI_API_KEY || settings?.supervisorApiKey;

    if (!apiKey || apiKey === 'placeholder') {
        throw new Error('No OpenAI API key configured for RAG');
    }

    // 1. Get embedding for the query
    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ input: query, model: "text-embedding-3-small" })
    });

    if (!response.ok) {
        throw new Error(`OpenAI Embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    const queryEmbedding = new Float32Array(data.data[0].embedding);

    // 2. Fetch all chunks (this could be slow for huge repos, but fits Lean Core)
    const chunks = await prisma.codeChunk.findMany();
    
    // 3. Calculate similarities
    const scoredChunks = chunks.map(chunk => {
        if (!chunk.embedding) return { chunk, score: 0 };
        const chunkEmbedding = new Float32Array(
            chunk.embedding.buffer,
            chunk.embedding.byteOffset,
            chunk.embedding.byteLength / Float32Array.BYTES_PER_ELEMENT
        );
        return {
            chunk,
            score: cosineSimilarity(queryEmbedding, chunkEmbedding)
        };
    });

    // 4. Sort and return top K
    return scoredChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(sc => ({
            filepath: sc.chunk.filepath,
            content: sc.chunk.content,
            startLine: sc.chunk.startLine,
            endLine: sc.chunk.endLine,
            score: sc.score
        }));
}
