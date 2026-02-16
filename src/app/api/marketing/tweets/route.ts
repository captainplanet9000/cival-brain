import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const status = req.nextUrl.searchParams.get('status');
  const category = req.nextUrl.searchParams.get('category');
  const project = req.nextUrl.searchParams.get('project');
  const tweet_type = req.nextUrl.searchParams.get('tweet_type');
  let q = sb.from('marketing_tweets').select('*').order('scheduled_for', { ascending: true, nullsFirst: false });
  if (status) q = q.eq('status', status);
  if (category) q = q.eq('category', category);
  if (project) q = q.eq('project', project);
  if (tweet_type) q = q.eq('tweet_type', tweet_type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  if (Array.isArray(body)) {
    const { data, error } = await sb.from('marketing_tweets').insert(body).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  const { data, error } = await sb.from('marketing_tweets').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { id, ...rest } = body;
  rest.updated_at = new Date().toISOString();
  const { data, error } = await sb.from('marketing_tweets').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = getServiceSupabase();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await sb.from('marketing_tweets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
