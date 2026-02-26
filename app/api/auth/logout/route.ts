import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout (DEPRECATED)
 * 
 * This legacy endpoint is superseded by NextAuth's built-in signOut flow.
 * Session destruction is now handled via NextAuth signOut() at /api/auth/signout.
 * This route is preserved for backwards-compatibility but returns a
 * deprecation notice directing callers to the new auth flow.
 */
export async function POST() {
  return NextResponse.json(
    { message: 'Manual logout is deprecated. Use NextAuth signOut() via /api/auth/signout instead.' },
    { status: 410 } // 410 Gone
  );
}
