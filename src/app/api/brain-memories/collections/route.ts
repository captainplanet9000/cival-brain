import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();

    // Get all collections
    const { data: collections, error: collectionsError } = await supabase
      .from('brain_memory_collections')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');

    if (collectionsError) throw collectionsError;

    // Get memory counts for each collection
    const { data: memories, error: memoriesError } = await supabase
      .from('brain_memories')
      .select('collection_id, is_active');

    if (memoriesError) throw memoriesError;

    // Count memories per collection
    const collectionCounts: { [key: string]: number } = {};
    const collectionActiveCounts: { [key: string]: number } = {};
    
    memories?.forEach((memory) => {
      const id = memory.collection_id || 'null';
      collectionCounts[id] = (collectionCounts[id] || 0) + 1;
      if (memory.is_active) {
        collectionActiveCounts[id] = (collectionActiveCounts[id] || 0) + 1;
      }
    });

    // Add counts to collections
    const collectionsWithCounts = collections?.map(collection => ({
      ...collection,
      memory_count: collectionCounts[collection.id] || 0,
      active_count: collectionActiveCounts[collection.id] || 0,
    }));

    return NextResponse.json(collectionsWithCounts || []);
  } catch (error: any) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await request.json();
    
    const { name, description, icon, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('brain_memory_collections')
      .insert({
        name,
        description,
        icon: icon || '📁',
        color: color || '#6366f1',
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
