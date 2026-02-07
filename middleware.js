// middleware.js - Block debug endpoints in production
import { NextResponse } from 'next/server';

export function middleware(req) {
  // Only apply this in production environments
  if (process.env.NODE_ENV === 'production') {
    const url = req.nextUrl.pathname;

    const isDebugEndpoint =
      url.includes('/api/debug/') ||
      url.match(/\/api\/.*-test/) ||
      url.match(/\/api\/test-.*/) ||
      url.match(/\/api\/.*example.*/) ||
      url.match(/\/api\/.*mock.*/);

    // Return 404 for debug endpoints in production
    if (isDebugEndpoint) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  // Allow request to continue
  return NextResponse.next();
}

// Specify which routes this middleware should run on
export const config = {
  matcher: '/api/:path*',
};