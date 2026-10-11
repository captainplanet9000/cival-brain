import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('cival-brain-session', '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
