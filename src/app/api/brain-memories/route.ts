import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category');
    const agentId = searchParams.get('agent_id');
    const collectionId = searchParams.get('collection_id');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('active_only') !== 'false';
    const pinnedOnly = searchParams.get('pinned_only') === 'true';

    let query = supabase
      .from('brain_memories')
      .select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (pinnedOnly) {
      query = query.eq('is_pinned', true);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }

    if (agentId) {
      query = query.or(`agent_ids.cs.{${agentId}},agent_ids.eq.{}`);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    query = query.order('is_pinned', { ascending: false })
                 .order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching memories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await request.json();
    
    const { title, content, category, tags, agent_ids, collection_id, source } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const tokenCount = Math.ceil(content.length / 4);

    const { data, error } = await supabase
      .from('brain_memories')
      .insert({
        title,
        content,
        category: category || 'general',
        tags: tags || [],
        agent_ids: agent_ids || [],
        collection_id,
        source: source || 'manual',
        token_count: tokenCount,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating memory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
