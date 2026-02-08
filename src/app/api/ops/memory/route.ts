import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const agent = req.nextUrl.searchParams.get('agent_id');
  let q = sb.from('ops_agent_memory').select('*').order('created_at', { ascending: false }).limit(100);
  if (agent) q = q.eq('agent_id', agent);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { data, error } = await sb.from('ops_agent_memory').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
