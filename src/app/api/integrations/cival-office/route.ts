/** Copy to Brain src/app/api/integrations/cival-office/route.ts. Requires a host-only shared token. */
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = process.env.CIVAL_BRAIN_TOKEN;
  if (!token || token.length < 32) return NextResponse.json({ error: 'Office receiver is not configured' }, { status: 503 });
  const supplied = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const expected = Buffer.from(token);
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    // Stream the body with a cap, including chunked requests without Content-Length.
    if (Number(req.headers.get('content-length') ?? 0) > 8192) return NextResponse.json({ error: 'Body too large' }, { status: 413 });
    const reader = req.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'Missing body' }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > 8192) { await reader.cancel(); return NextResponse.json({ error: 'Body too large' }, { status: 413 }); }
      chunks.push(chunk.value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const event = body.event;
    if (body.version !== 1 || !event || typeof event !== 'object' ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(event.id ?? '') ||
      typeof event.title !== 'string' || !event.title || event.title.length > 160 ||
      typeof event.detail !== 'string' || event.detail.length > 500 ||
      !['mission.created', 'mission.status', 'app.launch', 'app.inspect', 'artifact.open', 'pipeline.launcher'].includes(event.kind) ||
      !Number.isSafeInteger(event.at) || event.at < 0) return NextResponse.json({ error: 'Invalid office event' }, { status: 400 });
    const sb = getServiceSupabase();
    // Existing event table, stable event UUID: retries cannot duplicate delivery.
    const { error } = await sb.from('ops_agent_events').upsert({
      id: event.id, agent_id: 'cival-office', kind: event.kind,
      title: event.title, summary: event.detail,
      tags: ['cival-office', 'gwds'], metadata: { source: 'cival-agent-world', event_at: event.at, schema_version: 1 },
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: 'Office event persistence failed' }, { status: 502 });
    return NextResponse.json({ accepted: true, id: event.id });
  } catch { return NextResponse.json({ error: 'Office event rejected' }, { status: 400 }); }
}
