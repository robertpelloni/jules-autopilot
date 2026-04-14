import { prisma } from '../lib/prisma/index.ts';
import axios from 'axios';
import crypto from 'crypto';

export interface SearchResult {
    id: string;
    filepath: string;
    content: string;
    score: number;
    origin: 'code' | 'history';
}

export async function fetchEmbedding(input: string, apiKey: string): Promise<number[]> {
    const response = await axios.post('https://api.openai.com/v1/embeddings', {
        input,
        model: 'text-embedding-3-small'
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.data[0].embedding;
}

export async function queryCodebase(query: string, apiKey: string, topK: number = 5): Promise<SearchResult[]> {
    try {
        const queryEmbedding = await fetchEmbedding(query, apiKey);
        const chunks = await prisma.codeChunk.findMany();

        // Simple cosine similarity in memory for now
        // A production version would use a vector database (Pinecone, Chroma, etc.) or SQLite extension
        const results = chunks.map(chunk => {
            const chunkEmbedding = JSON.parse(Buffer.from(chunk.embedding).toString()) as number[];
            const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
            return {
                id: chunk.id,
                filepath: chunk.filepath,
                content: chunk.content,
                score,
                origin: 'code' as const
            };
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    } catch (error) {
        console.error('[RAG] Query failed:', error);
        return [];
    }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}
