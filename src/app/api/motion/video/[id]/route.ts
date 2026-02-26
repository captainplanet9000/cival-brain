import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = getServiceSupabase();

  const { data: project } = await sb
    .from('motion_projects')
    .select('render_output_path, status, title')
    .eq('id', id)
    .single();

  if (!project || project.status !== 'rendered' || !project.render_output_path) {
    return NextResponse.json({ 
      error: 'Video not ready', 
      status: project?.status || 'not found' 
    }, { status: 404 });
  }

  // Return the file path info - the actual video is served locally
  // On Vercel this returns metadata, locally it could stream the file
  return NextResponse.json({
    title: project.title,
    status: project.status,
    videoPath: project.render_output_path,
    // For local access, the video is at this path on Anthony's machine
    localUrl: `file:///${project.render_output_path.replace(/\\/g, '/')}`,
  });
}
