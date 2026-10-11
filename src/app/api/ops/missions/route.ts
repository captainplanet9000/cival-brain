import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { readTaskBody } from '@/lib/task-input';
import { missionUpdates } from '@/lib/ops-input';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  if ((status?.length ?? 0) > 100) return NextResponse.json({ error: 'Invalid mission filter' }, { status: 400 });
  try {
  const sb = getServiceSupabase();
  let q = sb.from('ops_missions').select('*').order('created_at', { ascending: false }).limit(200);
  if (status) q = q.eq('status', status);
  const { data: missions, error } = await q.abortSignal(AbortSignal.timeout(5000));
  if (error) return NextResponse.json({ error: 'Missions could not be read' }, { status: 502 });
  if (!missions?.length) return NextResponse.json([]);
  const { data: steps, error: stepsError } = await sb.from('ops_mission_steps').select('*').in('mission_id', missions.map((m) => m.id)).limit(5000).abortSignal(AbortSignal.timeout(5000));
  if (stepsError) return NextResponse.json({ error: 'Mission steps could not be read' }, { status: 502 });
  return NextResponse.json(missions.map((m) => ({ ...m, ops_mission_steps: (steps ?? []).filter((s) => s.mission_id === m.id) })));
  } catch { return NextResponse.json({ error: 'Missions could not be read' }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  let body;
  try { body = await readTaskBody(req); }
  catch { return NextResponse.json({ error: 'Invalid mission request' }, { status: 400 }); }
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 300 || (body.steps !== undefined && (!Array.isArray(body.steps) || body.steps.length > 100))) {
    return NextResponse.json({ error: 'Invalid mission title or steps' }, { status: 400 });
  }
  try {
    const { steps = [], ...mission } = body;
    const { data, error } = await getServiceSupabase().rpc('create_brain_mission', { mission, steps });
    if (error) return NextResponse.json({ error: error.code === '22023' ? 'Invalid mission or step' : 'Mission storage is unavailable' }, { status: error.code === '22023' ? 400 : 503 });
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: 'Mission storage is unavailable' }, { status: 503 }); }
}

export async function PATCH(req: NextRequest) {
  let body, updates;
  try { body = await readTaskBody(req); updates = missionUpdates(body); }
  catch { return NextResponse.json({ error: 'Invalid mission changes' }, { status: 400 }); }
  try {
    const { data, error } = await getServiceSupabase().from('ops_missions').update(updates).eq('id', body.id).select().maybeSingle();
    if (error) return NextResponse.json({ error: 'Mission storage is unavailable' }, { status: 503 });
    if (!data) return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: 'Mission storage is unavailable' }, { status: 503 }); }
}
