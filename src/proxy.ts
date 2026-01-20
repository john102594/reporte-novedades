import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // 1. Public Paths (Login, Assets)
  if (pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    // If user is already logged in and tries to go to login, redirect to production
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/production', request.url));
    }
    return NextResponse.next();
  }

  // 2. Auth Check
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Role-Based Access Control
  const userData = JSON.parse(session.value);
  const role = userData.role;

  // Protect /masters routes - Only MANAGER (Admin) can access
  if (pathname.startsWith('/masters') && role !== 'MANAGER') {
    return NextResponse.redirect(new URL('/production', request.url)); // Redirect to home/production
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
