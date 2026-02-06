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

  // Block /masters/areas for non-ADMIN (ABAC restriction)
  if (pathname === '/masters/areas' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/masters/machines', request.url));
  }

  // Protect /masters routes - Only MANAGER, ADMIN, COORDINATOR can access
  if (pathname.startsWith('/masters') && !['MANAGER', 'ADMIN', 'COORDINATOR'].includes(role)) {
    return NextResponse.redirect(new URL('/production', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
