import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createErrorResponse, handleInternalError } from '@/lib/api/error';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return createErrorResponse(req, 'BAD_REQUEST', 'Path is required', 400);
    }

    const basePath = process.cwd();
    const fullPath = path.resolve(basePath, filePath);

    // Security check: ensure we don't break out of the project root
    if (!fullPath.startsWith(basePath)) {
      return createErrorResponse(req, 'FORBIDDEN', 'Access denied', 403);
    }

    const content = await fs.readFile(fullPath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error) {
    return handleInternalError(req, error);
  }
}
