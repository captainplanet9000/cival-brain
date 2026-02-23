import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('brain_memories')
      .select('*')
      .eq('is_active', true)
      .or(`title.ilike.%${q}%,content.ilike.%${q}%,tags.cs.{${q}}`)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Add snippets for search results
    const results = data?.map(memory => {
      const contentLower = memory.content.toLowerCase();
      const qLower = q.toLowerCase();
      const index = contentLower.indexOf(qLower);
      
      let snippet = '';
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(memory.content.length, index + q.length + 50);
        snippet = (start > 0 ? '...' : '') + 
                  memory.content.slice(start, end) + 
                  (end < memory.content.length ? '...' : '');
      } else {
        snippet = memory.content.slice(0, 150) + (memory.content.length > 150 ? '...' : '');
      }

      return {
        ...memory,
        snippet,
      };
    });

    return NextResponse.json(results || []);
  } catch (error: any) {
    console.error('Error searching memories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
