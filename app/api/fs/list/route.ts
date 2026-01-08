export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dir = searchParams.get('path') || '.';
    
    const basePath = process.cwd();
    const fullPath = path.resolve(basePath, dir);

    if (!fullPath.startsWith(basePath)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (process.env.VERCEL && dir === '.') {
         return NextResponse.json({
             files: [
                 { name: 'app', isDirectory: true, path: 'app' },
                 { name: 'components', isDirectory: true, path: 'components' },
                 { name: 'lib', isDirectory: true, path: 'lib' },
                 { name: 'public', isDirectory: true, path: 'public' },
                 { name: 'prisma', isDirectory: true, path: 'prisma' },
             ]
         });
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.relative(basePath, path.join(fullPath, entry.name))
    }));

    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
