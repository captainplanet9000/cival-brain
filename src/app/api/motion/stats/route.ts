import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { readdir } from 'fs/promises';

const AUDIO_DIR = 'C:\\GWDS\\video-studio\\audio-assets';

export async function GET() {
  const sb = getServiceSupabase();

  const [projectsRes, queueRes, promptsRes] = await Promise.all([
    sb.from('motion_projects').select('status'),
    sb.from('motion_queue').select('status'),
    sb.from('motion_prompts').select('is_favorite')
  ]);

  const projects = projectsRes.data || [];
  const queue = queueRes.data || [];
  const prompts = promptsRes.data || [];

  const byStatus: Record<string, number> = {};
  projects.forEach((p: any) => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });

  const queueStatus: Record<string, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };
  queue.forEach((q: any) => {
    queueStatus[q.status] = (queueStatus[q.status] || 0) + 1;
  });

  let audioFileCount = 0;
  try {
    const files = await readdir(AUDIO_DIR);
    audioFileCount = files.filter(f => f.endsWith('.mp3')).length;
  } catch (err) {
    audioFileCount = 0;
  }

  return NextResponse.json({
    projects: {
      total: projects.length,
      byStatus
    },
    queue: queueStatus,
    prompts: {
      total: prompts.length,
      favorites: prompts.filter((p: any) => p.is_favorite).length
    },
    audioFiles: audioFileCount
  });
}
