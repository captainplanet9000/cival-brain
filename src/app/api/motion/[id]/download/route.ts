import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { readFile, stat } from 'fs/promises';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = getServiceSupabase();
  const { id } = await params;

  const { data: project, error } = await sb
    .from('motion_projects')
    .select('render_output_path, title, status')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  
  if (project.status !== 'rendered' || !project.render_output_path) {
    return NextResponse.json({ error: 'Project not yet rendered' }, { status: 404 });
  }

  try {
    await stat(project.render_output_path);
    const fileBuffer = await readFile(project.render_output_path);
    
    const filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Video file not found', details: err.message }, { status: 404 });
  }
}
