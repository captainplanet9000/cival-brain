import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { exec } from 'child_process';
import { promisify } from 'util';
import { stat } from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();

  const { data: queueItems, error: queueError } = await sb
    .from('motion_queue')
    .select('*, motion_projects(*)')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);

  if (queueError) return NextResponse.json({ error: queueError.message }, { status: 500 });
  if (!queueItems || queueItems.length === 0) {
    return NextResponse.json({ message: 'No pending items in queue' }, { status: 200 });
  }

  const queueItem = queueItems[0];
  const project = queueItem.motion_projects;

  await sb
    .from('motion_queue')
    .update({ 
      status: 'processing', 
      started_at: new Date().toISOString() 
    })
    .eq('id', queueItem.id);

  await sb
    .from('motion_projects')
    .update({ 
      status: 'rendering', 
      updated_at: new Date().toISOString() 
    })
    .eq('id', project.id);

  const outputPath = `C:\\GWDS\\video-studio\\exports\\${project.id}.mp4`;
  const propsJson = JSON.stringify(project.scene_config).replace(/"/g, '\\"');
  const command = `npx remotion render src/remotion/index.ts MainComposition "${outputPath}" --props "${propsJson}"`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: 'C:\\GWDS\\video-studio\\gwds-videos',
      timeout: 600000
    });

    const fileStats = await stat(outputPath);

    await sb
      .from('motion_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', queueItem.id);

    await sb
      .from('motion_projects')
      .update({
        status: 'rendered',
        render_output_path: outputPath,
        render_file_size: fileStats.size,
        updated_at: new Date().toISOString()
      })
      .eq('id', project.id);

    return NextResponse.json({
      success: true,
      queueItem: { ...queueItem, status: 'completed' },
      output: { stdout, stderr }
    });

  } catch (err: any) {
    await sb
      .from('motion_queue')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: err.message || 'Render failed'
      })
      .eq('id', queueItem.id);

    await sb
      .from('motion_projects')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', project.id);

    return NextResponse.json({
      success: false,
      error: err.message,
      queueItem: { ...queueItem, status: 'failed', error_message: err.message }
    }, { status: 500 });
  }
}
