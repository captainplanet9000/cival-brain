import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'markdown';

    const { data: memories, error } = await supabase
      .from('brain_memories')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('title');

    if (error) throw error;

    if (format === 'json') {
      return NextResponse.json(memories || []);
    } else {
      // Markdown format
      let markdown = '# Memory Export\n\n';
      markdown += `Generated: ${new Date().toISOString()}\n\n`;
      markdown += `Total Memories: ${memories?.length || 0}\n\n`;
      markdown += '---\n\n';

      const byCategory: { [key: string]: any[] } = {};
      memories?.forEach(memory => {
        const cat = memory.category || 'general';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(memory);
      });

      Object.entries(byCategory).forEach(([category, mems]) => {
        markdown += `# ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
        
        mems.forEach(memory => {
          markdown += `## ${memory.title}\n\n`;
          markdown += `${memory.content}\n\n`;
          
          if (memory.tags && memory.tags.length > 0) {
            markdown += `**Tags:** ${memory.tags.join(', ')}\n\n`;
          }
          
          markdown += '---\n\n';
        });
      });

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="memories-export-${Date.now()}.md"`,
        },
      });
    }
  } catch (error: any) {
    console.error('Error exporting memories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
