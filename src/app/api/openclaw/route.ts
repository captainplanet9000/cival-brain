import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'https://desktop-2948l01.taile3b948.ts.net';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    const { action, params } = await req.json();

    if (!GATEWAY_TOKEN) {
      return NextResponse.json({ status: 'not_configured', error: 'OpenClaw gateway token not configured' }, { status: 503 });
    }

    if (action === 'chat') {
      const messages = params?.messages;
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
      }

      const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
        signal: AbortSignal.timeout(30000),
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
        return NextResponse.json(
          { error: 'The assistant gateway could not complete the request' },
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
          signal: AbortSignal.timeout(5000),
          method: 'OPTIONS',
          headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
        });
        return NextResponse.json({ status: res.ok ? 'online' : res.status === 401 || res.status === 403 ? 'unauthorized' : 'offline' });
      } catch {
        // Try a simpler check
        try {
          const res = await fetch(GATEWAY_URL, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
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
