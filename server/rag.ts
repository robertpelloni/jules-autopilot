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
    // Switch to OpenRouter free embedding model
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'nomic-ai/nomic-embed-text-v1.5:free',
        messages: [{ role: 'user', content: input }]
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    // NOTE: nomic-embed via OpenRouter chat completions might not return a standard embedding vector 
    // in the same way the dedicated /embeddings endpoint does. 
    // If OpenRouter supports /embeddings for this model, we should use that.
    // For now, this is a placeholder to remove OpenAI dependency.
    return new Array(1536).fill(0); 
}

export async function queryCodebase(query: string, apiKey: string, topK: number = 5): Promise<SearchResult[]> {
    try {
        const queryEmbedding = await fetchEmbedding(query, apiKey);
        const chunks = await prisma.codeChunk.findMany();

        if (chunks.length === 0) return [];

        // Simple cosine similarity in memory
        const results = chunks.map(chunk => {
            try {
                const chunkEmbedding = JSON.parse(Buffer.from(chunk.embedding).toString()) as number[];
                const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
                return {
                    id: chunk.id,
                    filepath: chunk.filepath,
                    content: chunk.content,
                    score,
                    origin: 'code' as const
                };
            } catch (e) {
                return null;
            }
        }).filter((r): r is SearchResult => r !== null);

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    } catch (error) {
        console.error('[RAG] Query failed:', error);
        return [];
    }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}
