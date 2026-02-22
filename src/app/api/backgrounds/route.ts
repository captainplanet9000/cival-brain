import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const mood = url.searchParams.get('mood');
  const style = url.searchParams.get('style');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const motion_type = url.searchParams.get('motion_type');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = sb.from('background_prompts').select('*', { count: 'exact' });

  if (category) query = query.eq('category', category);
  if (mood) query = query.eq('mood', mood);
  if (style) query = query.eq('style', style);
  if (status) query = query.eq('status', status);
  if (motion_type) query = query.eq('motion_type', motion_type);
  if (search) query = query.or(`title.ilike.%${search}%,prompt.ilike.%${search}%`);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();

  const { data, error } = await sb.from('background_prompts').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  updates.updated_at = new Date().toISOString();
  const { data, error } = await sb.from('background_prompts').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = getServiceSupabase();
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await sb.from('background_prompts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
