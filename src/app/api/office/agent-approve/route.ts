import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { agentId } = await request.json();
    return NextResponse.json({ ok: true, msg: `${agentId} approved` });
  } catch (error) {
    return NextResponse.json({ ok: false, msg: 'Invalid request' }, { status: 400 });
  }
}
