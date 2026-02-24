import { NextRequest, NextResponse } from 'next/server';
import { compactSessionHistory } from '@/lib/memory/compaction';
import fs from 'fs/promises';
import path from 'path';
import { createErrorResponse, handleInternalError } from '@/lib/api/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'compact') {
      const { activities, config } = body;
      if (!activities || !config) {
        return createErrorResponse(req, 'BAD_REQUEST', 'Missing activities or config', 400);
      }

      const memory = await compactSessionHistory(activities, config);
      return NextResponse.json(memory);
    }

    if (action === 'save') {
      const { memory, filename } = body;
      if (!memory || !filename) {
        return createErrorResponse(req, 'BAD_REQUEST', 'Missing memory or filename', 400);
      }

      // Ensure .jules/memories exists
      const memoriesDir = path.join(process.cwd(), '.jules', 'memories');
      await fs.mkdir(memoriesDir, { recursive: true });

      const filePath = path.join(memoriesDir, filename);
      await fs.writeFile(filePath, JSON.stringify(memory, null, 2));

      return NextResponse.json({ success: true, path: filePath });
    }

    if (action === 'list') {
      const memoriesDir = path.join(process.cwd(), '.jules', 'memories');
      try {
        await fs.access(memoriesDir);
        const files = await fs.readdir(memoriesDir);
        const memories = [];
        for (const file of files) {
          if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(memoriesDir, file), 'utf-8');
            try {
              memories.push({ filename: file, ...JSON.parse(content) });
            } catch (e) {
              console.error(`Failed to parse memory file ${file}`, e);
            }
          }
        }
        return NextResponse.json({ memories });
      } catch (e) {
        return NextResponse.json({ memories: [] });
      }
    }

    return createErrorResponse(req, 'BAD_REQUEST', 'Invalid action', 400);

  } catch (error) {
    return handleInternalError(req, error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return createErrorResponse(req, 'BAD_REQUEST', 'Missing filename', 400);
    }

    // Security check: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return createErrorResponse(req, 'BAD_REQUEST', 'Invalid filename', 400);
    }

    const memoriesDir = path.join(process.cwd(), '.jules', 'memories');
    const filePath = path.join(memoriesDir, filename);

    try {
      await fs.access(filePath);
    } catch {
      return createErrorResponse(req, 'NOT_FOUND', 'File not found', 404);
    }

    await fs.unlink(filePath);

    return NextResponse.json({ success: true });

  } catch (error) {
    return handleInternalError(req, error);
  }
}

