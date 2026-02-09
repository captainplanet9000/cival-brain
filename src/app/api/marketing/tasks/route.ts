import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const contentId = req.nextUrl.searchParams.get('content_id');
  let q = sb.from('marketing_job_tasks').select('*').order('sort_order', { ascending: true });
  if (contentId) q = q.eq('content_id', contentId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  // Support bulk insert (array)
  const items = Array.isArray(body) ? body : [body];
  const { data, error } = await sb.from('marketing_job_tasks').insert(items).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { id, ...rest } = body;
  if (rest.status === 'done' && !rest.completed_at) rest.completed_at = new Date().toISOString();
  if (rest.status && rest.status !== 'done') rest.completed_at = null;
  const { data, error } = await sb.from('marketing_job_tasks').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = getServiceSupabase();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await sb.from('marketing_job_tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
