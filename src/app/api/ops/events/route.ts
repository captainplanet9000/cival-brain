import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const agent = req.nextUrl.searchParams.get('agent_id');
  const kind = req.nextUrl.searchParams.get('kind');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
  let q = sb.from('ops_agent_events').select('*').order('created_at', { ascending: false }).limit(limit);
  if (agent) q = q.eq('agent_id', agent);
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { data, error } = await sb.from('ops_agent_events').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
