import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const body = await request.json();

    const { name, description, icon, color } = body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;

    const { data, error } = await supabase
      .from('brain_memory_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating collection:', error);
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

    // Get the default collection
    const { data: defaultCollection } = await supabase
      .from('brain_memory_collections')
      .select('id')
      .eq('is_default', true)
      .single();

    if (!defaultCollection) {
      return NextResponse.json(
        { error: 'No default collection found' },
        { status: 500 }
      );
    }

    // Move all memories from this collection to default
    await supabase
      .from('brain_memories')
      .update({ collection_id: defaultCollection.id })
      .eq('collection_id', id);

    // Delete the collection
    const { error } = await supabase
      .from('brain_memory_collections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting collection:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
