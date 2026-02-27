import { insertChunk, searchSimilar, clearChunksForFile } from '../lib/api/rag';

async function main() {
    console.log('Testing Zero-Config TypeScript RAG...');
    try {
        const filePath = 'test.ts';
        await clearChunksForFile(filePath);

        const mockEmbedding1 = Array(1536).fill(0).map(() => Math.random());
        const mockEmbedding2 = Array(1536).fill(0).map(() => Math.random());
        // Normalize a specific vector to pretend it's the exact perfect match
        const mockExactMatch = Array(1536).fill(0);
        mockExactMatch[0] = 1.0;

        console.log('Inserting Chunks...');
        await insertChunk(filePath, 1, 5, 'console.log("Random1");', mockEmbedding1, 'sum1');
        await insertChunk(filePath, 6, 10, 'console.log("Random2");', mockEmbedding2, 'sum2');
        await insertChunk(filePath, 11, 15, 'console.log("MATCH!");', mockExactMatch, 'sum3');

        console.log('Search for exact match...');
        const results = await searchSimilar(mockExactMatch, 2);

        console.log('✅ Top Match:', results[0].content, '| Score:', results[0].score);

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        process.exit(0);
    }
}

main();
