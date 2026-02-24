import { NextResponse } from 'next/server';
import { setSession } from '@/lib/session';
import { createErrorResponse, handleInternalError } from '@/lib/api/error';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey) return createErrorResponse(req, 'BAD_REQUEST', 'API Key required', 400);

    await setSession(apiKey);
    return NextResponse.json({ success: true });
  } catch (e) {
    return handleInternalError(req, e);
  }
}
