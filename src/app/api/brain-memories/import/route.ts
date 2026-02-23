import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await request.json();
    
    const { content, auto_split, collection_id } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    let memories: Array<{ title: string; content: string }> = [];

    if (auto_split) {
      // Split by ## headers
      const sections = content.split(/^##\s+/m).filter((s: string) => s.trim());
      
      memories = sections.map((section: string) => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        const text = lines.slice(1).join('\n').trim();
        
        return {
          title: title || 'Untitled',
          content: text || section.trim(),
        };
      });

      // If no ## headers found, create a single memory
      if (memories.length === 0) {
        memories = [{
          title: 'Imported Memory',
          content: content.trim(),
        }];
      }
    } else {
      // Single memory
      memories = [{
        title: 'Imported Memory',
        content: content.trim(),
      }];
    }

    // Insert memories
    const memoriesToInsert = memories.map(m => ({
      title: m.title,
      content: m.content,
      category: 'document',
      source: 'imported',
      collection_id,
      token_count: Math.ceil(m.content.length / 4),
    }));

    const { data, error } = await supabase
      .from('brain_memories')
      .insert(memoriesToInsert)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      memories: data,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error importing memories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
