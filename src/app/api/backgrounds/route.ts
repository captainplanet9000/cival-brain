import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const mood = url.searchParams.get('mood');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const sort = url.searchParams.get('sort') || 'newest';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let query = sb.from('background_prompts').select('*', { count: 'exact' });

  if (category) query = query.eq('category', category);
  if (mood) query = query.eq('mood', mood);
  if (status) query = query.eq('status', status);
  if (search) query = query.or(`title.ilike.%${search}%,prompt.ilike.%${search}%`);

  switch (sort) {
    case 'oldest': query = query.order('created_at', { ascending: true }); break;
    case 'most_used': query = query.order('usage_count', { ascending: false }); break;
    case 'alpha': query = query.order('title', { ascending: true }); break;
    default: query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, limit, totalPages: Math.ceil((count || 0) / limit) });
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
  
  // Bulk update
  if (body.ids && Array.isArray(body.ids)) {
    const { ids, ...updates } = body;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await sb.from('background_prompts').update(updates).in('id', ids).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, count: data?.length });
  }

  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  updates.updated_at = new Date().toISOString();
  const { data, error } = await sb.from('background_prompts').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json().catch(() => null);
  
  // Bulk delete
  if (body?.ids && Array.isArray(body.ids)) {
    const { error } = await sb.from('background_prompts').delete().in('id', body.ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, deleted: body.ids.length });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await sb.from('background_prompts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
