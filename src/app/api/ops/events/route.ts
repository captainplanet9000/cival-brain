import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { readTaskBody } from '@/lib/task-input';
import { eventInput } from '@/lib/ops-input';

export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get('agent_id');
  const kind = req.nextUrl.searchParams.get('kind');
  const limit = Number(req.nextUrl.searchParams.get('limit') || '50');
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || (agent?.length ?? 0) > 200 || (kind?.length ?? 0) > 100) return NextResponse.json({ error: 'Invalid event filters' }, { status: 400 });
  try {
  const sb = getServiceSupabase();
  let q = sb.from('ops_agent_events').select('*').order('created_at', { ascending: false }).limit(limit);
  if (agent) q = q.eq('agent_id', agent);
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q.abortSignal(AbortSignal.timeout(5000));
  if (error) return NextResponse.json({ error: 'Events could not be read' }, { status: 503 });
  return NextResponse.json(data);
  } catch { return NextResponse.json({ error: 'Events could not be read' }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  let event;
  try { event = eventInput(await readTaskBody(req)); }
  catch { return NextResponse.json({ error: 'Invalid event request' }, { status: 400 }); }
  try {
    const { data, error } = await getServiceSupabase().from('ops_agent_events').insert(event).select().single();
    if (error) return NextResponse.json({ error: 'Event storage is unavailable' }, { status: 503 });
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: 'Event storage is unavailable' }, { status: 503 }); }
}
