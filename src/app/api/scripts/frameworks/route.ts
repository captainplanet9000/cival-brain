import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();
  const { data, error } = await sb.from('script_frameworks').select('*').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get script counts per framework
  const { data: counts } = await sb.from('scripts').select('framework_id');
  const countMap: Record<string, number> = {};
  (counts || []).forEach((s: any) => {
    if (s.framework_id) countMap[s.framework_id] = (countMap[s.framework_id] || 0) + 1;
  });

  const enriched = (data || []).map(f => ({ ...f, script_count: countMap[f.id] || 0 }));
  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { data, error } = await sb.from('script_frameworks').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { data, error } = await sb.from('script_frameworks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
