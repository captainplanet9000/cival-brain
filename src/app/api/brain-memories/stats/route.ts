import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();

    // Get all memories
    const { data: memories, error } = await supabase
      .from('brain_memories')
      .select('*');

    if (error) throw error;

    const stats = {
      total: memories?.length || 0,
      active: memories?.filter(m => m.is_active).length || 0,
      pinned: memories?.filter(m => m.is_pinned).length || 0,
      total_tokens: memories?.reduce((sum, m) => sum + (m.token_count || 0), 0) || 0,
      by_category: {} as { [key: string]: number },
      by_collection: {} as { [key: string]: number },
      by_agent: {} as { [key: string]: number },
    };

    // Count by category
    memories?.forEach(memory => {
      const cat = memory.category || 'general';
      stats.by_category[cat] = (stats.by_category[cat] || 0) + 1;
    });

    // Count by collection
    memories?.forEach(memory => {
      const col = memory.collection_id || 'none';
      stats.by_collection[col] = (stats.by_collection[col] || 0) + 1;
    });

    // Count by agent (memories assigned to specific agents)
    memories?.forEach(memory => {
      if (memory.agent_ids && memory.agent_ids.length > 0) {
        memory.agent_ids.forEach((agentId: string) => {
          stats.by_agent[agentId] = (stats.by_agent[agentId] || 0) + 1;
        });
      } else {
        stats.by_agent['all'] = (stats.by_agent['all'] || 0) + 1;
      }
    });

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching memory stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
