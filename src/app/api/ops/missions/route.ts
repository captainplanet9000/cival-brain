import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const status = req.nextUrl.searchParams.get('status');
  let q = sb.from('ops_missions').select('*, ops_mission_steps(*)').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { steps, ...mission } = body;
  const { data, error } = await sb.from('ops_missions').insert(mission).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (steps?.length && data) {
    await sb.from('ops_mission_steps').insert(steps.map((s: any) => ({ ...s, mission_id: data.id })));
  }
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { id, ...updates } = body;
  const { data, error } = await sb.from('ops_missions').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
