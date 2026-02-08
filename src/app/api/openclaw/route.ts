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
      const messages = params?.messages;
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
      }

      const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          model: 'openclaw:main',
          messages: [
            { 
              role: 'system', 
              content: 'You are the Cival Brain assistant for GWDS (Gamma Waves Design Studio). You help with business operations, trading insights, content pipeline, and project management. Be concise and helpful. You have access to knowledge about: Cival Dashboard (trading), Honey Bunny, Clay Verse, Hunni Bunni Kitchen, What I Need to Hear (TikTok channels), The 400 Club (NFTs), and GWDS operations. Answer naturally like a knowledgeable team member.'
            },
            ...messages,
          ],
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
      const reply = data.choices?.[0]?.message?.content || 'No response';
      return NextResponse.json({ response: reply });
    }

    if (action === 'status') {
      try {
        const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
          method: 'OPTIONS',
          headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
        });
        // Any non-error response means gateway is reachable
        return NextResponse.json({ status: 'online' });
      } catch {
        // Try a simpler check
        try {
          const res = await fetch(GATEWAY_URL, { method: 'HEAD' });
          return NextResponse.json({ status: res.ok ? 'online' : 'offline' });
        } catch {
          return NextResponse.json({ status: 'offline' });
        }
      }
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
