import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function middleware(request: NextRequest) {
  // Allow all requests to bypass auth for local development
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
