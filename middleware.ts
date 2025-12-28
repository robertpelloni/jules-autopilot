import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

export async function middleware(req: NextRequest) {
  // Define public routes
  const publicRoutes = ['/login'];
  if (publicRoutes.includes(req.nextUrl.pathname)) {
      return NextResponse.next();
  }

  // Define protected routes (or default to all except api/static)
  // Checking specific routes for now to avoid blocking assets if matcher fails
  const protectedPrefixes = ['/'];
  const isProtected = protectedPrefixes.some(path => req.nextUrl.pathname.startsWith(path));

  // Exclude API routes from redirect logic (they should return 401 JSON)
  // Actually, for API routes we might want to let them handle it or block here.
  // Let's block page loads here.
  if (isProtected && !req.nextUrl.pathname.startsWith('/api') && !req.nextUrl.pathname.startsWith('/_next') && !req.nextUrl.pathname.includes('.')) {
    const cookie = req.cookies.get('session')?.value;
    if (!cookie) {
      return NextResponse.redirect(new URL('/login', req.nextUrl));
    }

    try {
        await decrypt(cookie);
    } catch {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
