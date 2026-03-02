import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { agentId, name } = await request.json();
    // For now, just acknowledge the request
    // In the future, this could remove the agent from the office view
    return NextResponse.json({ ok: true, msg: `${name || agentId} removed` });
  } catch (error) {
    return NextResponse.json({ ok: false, msg: 'Invalid request' }, { status: 400 });
  }
}
