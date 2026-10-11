import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isBrainAdministrator, officePermission, validOfficeToken } from './lib/brain-auth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/login' || pathname === '/api/auth/login') return NextResponse.next();
  const bearer = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (officePermission(pathname, request.method) && await validOfficeToken(bearer)) {
    return privateResponse();
  }
  const accessToken = request.cookies.get('cival-brain-session')?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (accessToken && url && key) {
    try {
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.getUser(accessToken);
      if (!error && isBrainAdministrator(data.user)) {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
            request.headers.get('origin') !== request.nextUrl.origin) {
          return NextResponse.json({ error: 'Origin rejected' }, { status: 403 });
        }
        return privateResponse();
      }
    } catch { /* fail closed */ }
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Authentication required' }, {
      status: 401, headers: { 'Cache-Control': 'private, no-store' },
    });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

function privateResponse() {
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

export const config = { matcher: ['/((?!_next/static|favicon.ico).*)'] };
