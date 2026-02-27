import { prisma } from '@/lib/prisma';

/**
 * Calculates the dot product of two normalized vectors.
 * If vectors are normalized (like OpenAI embeddings), dot product is equivalent to cosine similarity.
 */
export function cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
}

/**
 * Inserts a new codebase AST chunk and its 1536-dimensional embedding.
 */
export async function insertChunk(
    filePath: string,
    startLine: number,
    endLine: number,
    content: string,
    embeddingArray: number[],
    checksum: string
) {
    // Convert basic JS number array to strict 32-bit floats, then to a Node Buffer
    const floatArray = new Float32Array(embeddingArray);
    const buffer = Buffer.from(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);

    return prisma.codeChunk.create({
        data: {
            filePath,
            startLine,
            endLine,
            content,
            embedding: buffer,
            checksum
        }
    });
}

/**
 * Clear existing chunks for a file before re-indexing.
 */
export async function clearChunksForFile(filePath: string) {
    return prisma.codeChunk.deleteMany({
        where: { filePath }
    });
}

/**
 * Sweeps the SQLite database and performs a high-speed memory-side cosine similarity search.
 * Extremely fast for < 50,000 files in pure V8 JavaScript.
 */
export async function searchSimilar(queryEmbeddingArray: number[], topK: number = 5) {
    // Load standard subset from database
    const chunks = await prisma.codeChunk.findMany({
        where: { embedding: { not: null } },
        select: {
            id: true,
            filePath: true,
            startLine: true,
            endLine: true,
            content: true,
            embedding: true
        }
    });

    const queryFloatArray = new Float32Array(queryEmbeddingArray);

    const scoredChunks = chunks.map(chunk => {
        // Rehydrate Float32Array from Prisma Bytes (Buffer)
        const chunkFloatArray = new Float32Array(
            chunk.embedding!.buffer,
            chunk.embedding!.byteOffset,
            chunk.embedding!.byteLength / Float32Array.BYTES_PER_ELEMENT
        );

        const score = cosineSimilarity(queryFloatArray, chunkFloatArray);
        return { ...chunk, score };
    });

    // Sort descending (highest similarity first)
    scoredChunks.sort((a, b) => b.score - a.score);

    // Strip massive embedding buffer and return top K results
    return scoredChunks.slice(0, topK).map(({ embedding, ...rest }) => rest);
}
