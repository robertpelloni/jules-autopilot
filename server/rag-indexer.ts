import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { embedCodeChunk } from '@/lib/rag/embedder';

// Exclude these directories from being indexed
const IGNORE_DIRS = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.gemini',
    'coverage'
];

// Valid file extensions for RAG context
const VALID_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.json', '.prisma'];

/**
 * Heuristic chunker for source code.
 * Splits a file into roughly 100-line chunks, attempting to avoid breaking mid-function where possible.
 */
function chunkText(text: string, maxLines = 100): { content: string; startLine: number; endLine: number }[] {
    const lines = text.split('\n');
    const chunks: { content: string; startLine: number; endLine: number }[] = [];
    
    let currentChunk: string[] = [];
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
        currentChunk.push(lines[i]);

        if (currentChunk.length >= maxLines) {
            chunks.push({
                content: currentChunk.join('\n'),
                startLine,
                endLine: i + 1
            });
            currentChunk = [];
            startLine = i + 2;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n'),
            startLine,
            endLine: lines.length
        });
    }

    return chunks;
}

/**
 * Computes MD5 hash for cache-busting / diff validation.
 */
function computeChecksum(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * Scans a directory recursively and indexes files into vector storage for the global Agentic context.
 */
export async function indexWorkspace(workspaceId: string, rootDir: string) {
    console.log(`[RAG Indexer] Starting workspace indexing scan for ${workspaceId} at ${rootDir}`);

    const indexFile = async (filePath: string) => {
        const ext = path.extname(filePath);
        if (!VALID_EXTS.includes(ext)) return;

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (!content.trim()) return;

            const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
            
            // Check if file is exactly the same using checksum of entire file
            const fileChecksum = computeChecksum(content);
            const existingChunks = await prisma.codeChunk.count({
                where: { workspaceId, filepath: relativePath, checksum: fileChecksum }
            });

            if (existingChunks > 0) {
                // Already indexed this exact file state
                return;
            }

            console.log(`[RAG Indexer] Processing file: ${relativePath}`);
            const chunks = chunkText(content);

            // Clean previous chunks for this exact file
            await prisma.codeChunk.deleteMany({
                where: { workspaceId, filepath: relativePath }
            });

            for (const chunk of chunks) {
                const chunkChecksum = computeChecksum(chunk.content);
                const embeddingVector = await embedCodeChunk(chunk.content);

                let embeddingBuffer: Buffer | null = null;
                if (embeddingVector) {
                    // Convert Float32Array to Buffer for SQLite storage
                    const f32 = new Float32Array(embeddingVector);
                    embeddingBuffer = Buffer.from(f32.buffer);
                }

                await prisma.codeChunk.create({
                    data: {
                        workspaceId,
                        filepath: relativePath,
                        content: chunk.content,
                        startLine: chunk.startLine,
                        endLine: chunk.endLine,
                        embedding: embeddingBuffer,
                        checksum: chunkChecksum
                    }
                });
            }
        } catch (err) {
            console.error(`[RAG Indexer] Error processing ${filePath}:`, err);
        }
    };

    const walkDir = async (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (IGNORE_DIRS.includes(entry.name)) continue;

            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await walkDir(fullPath);
            } else if (entry.isFile()) {
                await indexFile(fullPath);
            }
        }
    };

    await walkDir(rootDir);
    console.log(`[RAG Indexer] Indexing complete for ${workspaceId}.`);
}
