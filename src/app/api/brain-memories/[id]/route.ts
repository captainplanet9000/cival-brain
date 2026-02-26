import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    const { data, error } = await supabase
      .from('brain_memories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching memory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const body = await request.json();

    const { title, content, category, tags, agent_ids, is_active, is_pinned, collection_id } = body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (content !== undefined) {
      updates.content = content;
      updates.token_count = Math.ceil(content.length / 4);
    }
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (agent_ids !== undefined) updates.agent_ids = agent_ids;
    if (is_active !== undefined) updates.is_active = is_active;
    if (is_pinned !== undefined) updates.is_pinned = is_pinned;
    if (collection_id !== undefined) updates.collection_id = collection_id;

    const { data, error } = await supabase
      .from('brain_memories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating memory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      // Hard delete
      const { error } = await supabase
        .from('brain_memories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      // Soft delete
      const { error } = await supabase
        .from('brain_memories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting memory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
