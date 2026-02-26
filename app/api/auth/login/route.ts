import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/api/error';

/**
 * POST /api/auth/login (DEPRECATED)
 * 
 * This legacy endpoint is superseded by NextAuth's built-in OAuth flow.
 * Authentication is now handled via NextAuth signIn() at /api/auth/signin.
 * This route is preserved for backwards-compatibility but returns a
 * deprecation notice directing callers to the new auth flow.
 */
export async function POST(req: Request) {
  return createErrorResponse(
    req,
    'DEPRECATED',
    'Manual API key login is deprecated. Use NextAuth OAuth flow via /api/auth/signin instead.',
    410 // 410 Gone
  );
}
