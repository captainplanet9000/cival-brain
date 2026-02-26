import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = getServiceSupabase();
  const { id } = await params;
  const body = await req.json();

  if (body.is_favorite !== undefined) {
    const { data: current } = await sb
      .from('motion_prompts')
      .select('is_favorite')
      .eq('id', id)
      .single();
    
    if (current) {
      body.is_favorite = !current.is_favorite;
    }
  }

  if (body.use_prompt) {
    const { data: current } = await sb
      .from('motion_prompts')
      .select('usage_count')
      .eq('id', id)
      .single();
    
    if (current) {
      body.usage_count = (current.usage_count || 0) + 1;
    }
    delete body.use_prompt;
  }

  const { data, error } = await sb
    .from('motion_prompts')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = getServiceSupabase();
  const { id } = await params;

  const { error } = await sb.from('motion_prompts').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
