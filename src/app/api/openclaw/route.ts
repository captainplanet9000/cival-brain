import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'https://desktop-2948l01.taile3b948.ts.net';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    const { action, params } = await req.json();

    if (!GATEWAY_TOKEN) {
      return NextResponse.json({ error: 'OpenClaw gateway token not configured' }, { status: 500 });
    }

    if (action === 'chat') {
      const message = params?.message;
      if (!message) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
      }

      // Send message to OpenClaw gateway HTTP API
      const res = await fetch(`${GATEWAY_URL}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          message,
          channel: 'web',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `Gateway error: ${res.status}`, details: errText },
          { status: res.status }
        );
      }

      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'status') {
      const res = await fetch(`${GATEWAY_URL}/api/v1/status`, {
        headers: {
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
      });
      if (!res.ok) {
        return NextResponse.json({ error: 'Gateway unreachable' }, { status: 502 });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
