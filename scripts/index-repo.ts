import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { insertChunk } from '../lib/api/rag';

const DIRECTORIES_TO_INDEX = ['app', 'lib', 'server', 'components', 'packages'];
const EXTENSIONS_TO_INDEX = ['.ts', '.tsx', '.js', '.jsx', '.md'];
const CHUNK_LINE_LIMIT = 150; // Simple line-based chunking fallback avoiding AST complexity

function getFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            // Avoid indexing build artifacts and modules
            if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
                getFiles(filePath, fileList);
            }
        } else {
            if (EXTENSIONS_TO_INDEX.includes(path.extname(filePath))) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

function chunkContent(content: string): { startLine: number; endLine: number; text: string }[] {
    const lines = content.split('\n');
    const chunks = [];
    for (let i = 0; i < lines.length; i += CHUNK_LINE_LIMIT) {
        const textStr = lines.slice(i, i + CHUNK_LINE_LIMIT).join('\n');
        chunks.push({
            startLine: i + 1,
            endLine: Math.min(i + CHUNK_LINE_LIMIT, lines.length),
            text: textStr
        });
    }
    return chunks;
}

function createChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function getEmbedding(text: string, apiKey: string): Promise<number[] | null> {
    try {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: text,
                model: "text-embedding-3-small"
            })
        });

        if (!response.ok) {
            console.error(`OpenAI API error: ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        return data.data[0].embedding;
    } catch (e) {
        console.error("OpenAI Embedding fetch failed:", e);
        return null;
    }
}

async function main() {
    console.log('Starting Local Codebase Ingestion Pipeline...');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('❌ OPENAI_API_KEY is not defined. Cannot generate embeddings.');
        process.exit(1);
    }

    const allFiles = DIRECTORIES_TO_INDEX.flatMap(dir => getFiles(path.join(process.cwd(), dir)));
    console.log(`Found ${allFiles.length} files to process.`);

    let newChunks = 0;
    let skippedChunks = 0;

    for (const file of allFiles) {
        const relativePath = file.replace(process.cwd() + path.sep, '');
        const content = fs.readFileSync(file, 'utf8');

        // Very basic minification guard
        if (content.length > 500000) {
            console.log(`Skipping massive file: ${relativePath}`);
            continue;
        }

        const chunks = chunkContent(content);

        for (const chunk of chunks) {
            const checksum = createChecksum(chunk.text);

            // Check if chunk already exists
            const existing = await prisma.codeChunk.findFirst({
                where: {
                    filePath: relativePath,
                    startLine: chunk.startLine,
                    checksum: checksum
                }
            });

            if (existing) {
                skippedChunks++;
                continue; // Skip embedding cost
            }

            console.log(`Embedding ${relativePath} (Lines ${chunk.startLine}-${chunk.endLine})...`);

            const embeddingArray = await getEmbedding(chunk.text, apiKey);
            if (embeddingArray) {
                await insertChunk(
                    relativePath,
                    chunk.startLine,
                    chunk.endLine,
                    chunk.text,
                    embeddingArray,
                    checksum
                );

                // Remove outdated chunks for this exact line range
                await prisma.codeChunk.deleteMany({
                    where: {
                        filePath: relativePath,
                        startLine: chunk.startLine,
                        checksum: { not: checksum }
                    }
                });

                newChunks++;
            }

            // Rate limit safety
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    console.log(`\n✅ Ingestion Complete!`);
    console.log(`New/Updated Chunks: ${newChunks}`);
    console.log(`Skipped (Unchanged): ${skippedChunks}`);
    process.exit(0);
}

main().catch(console.error);
