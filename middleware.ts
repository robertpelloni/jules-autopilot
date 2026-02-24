import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function middleware(request: NextRequest) {
  // We only want to intercept /api routes for this observability baseline
  if (request.nextUrl.pathname.startsWith('/api')) {
    const requestHeaders = new Headers(request.headers);

    // Check if the client already sent one, otherwise generate a fresh UUID
    const requestId = requestHeaders.get('x-request-id') || uuidv4();
    requestHeaders.set('x-request-id', requestId);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Also attach it to the response so the client can log it / show it on failure
    response.headers.set('x-request-id', requestId);

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
