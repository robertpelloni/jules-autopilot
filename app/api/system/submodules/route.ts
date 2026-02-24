import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { handleInternalError } from '@/lib/api/error';

export async function GET(req: Request) {
  try {
    const jsonPath = path.join(process.cwd(), 'app', 'submodules.json');

    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    }

    // Fallback if file doesn't exist (e.g. dev mode before prebuild)
    return NextResponse.json({
      submodules: [],
      warning: 'Submodule info not available (app/submodules.json missing)'
    });

  } catch (error) {
    return handleInternalError(req, error);
  }
}
