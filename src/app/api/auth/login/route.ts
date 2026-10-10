import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isBrainAdministrator } from '@/lib/brain-auth';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origin rejected' }, { status: 403 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 503 });
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) { await reader.cancel(); return NextResponse.json({ error: 'Request too large' }, { status: 413 }); }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof body.email !== 'string' || typeof body.password !== 'string' ||
        body.email.length > 254 || body.password.length > 1024) throw new Error('Invalid input');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: body.email, password: body.password });
    if (error || !data.session || !isBrainAdministrator(data.user)) {
      return NextResponse.json({ error: 'Sign-in failed or access is not authorized' }, { status: 401 });
    }
    const response = NextResponse.json({ authenticated: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set('cival-brain-session', data.session.access_token, {
      httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/',
      maxAge: Math.min(data.session.expires_in, 3600),
    });
    return response;
  } catch { return NextResponse.json({ error: 'Invalid sign-in request' }, { status: 400 }); }
  finally { reader.releaseLock(); }
}
