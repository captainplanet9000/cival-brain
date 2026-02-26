import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');

  let query = sb.from('motion_prompts').select('*');

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,prompt_text.ilike.%${search}%`);
  }

  const { data, error } = await query.order('usage_count', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();

  const record = {
    title: body.title,
    prompt_text: body.prompt_text,
    category: body.category || 'custom',
    tags: body.tags || [],
    scene_template: body.scene_template || {},
    is_favorite: body.is_favorite || false
  };

  const { data, error } = await sb
    .from('motion_prompts')
    .insert(record)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
