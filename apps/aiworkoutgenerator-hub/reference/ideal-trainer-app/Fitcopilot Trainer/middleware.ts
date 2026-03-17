import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow account page without authentication
  if (request.nextUrl.pathname === '/account') {
    return NextResponse.next();
  }

  // For protected routes, we'll handle authentication in the component
  // Middleware can't easily check Supabase session without making it a route handler
  // So we'll let the route handle protection via ProtectedRoute component
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets).*)'],
};
