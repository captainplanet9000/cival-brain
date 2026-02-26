import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  let query = sb.from('motion_projects').select('*');
  
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();

  const record = {
    title: body.title,
    description: body.description,
    prompt: body.prompt,
    scene_config: body.scene_config || {},
    brand_config: body.brand_config || {},
    duration_secs: body.duration_secs || 30,
    fps: body.fps || 30,
    width: body.width || 1920,
    height: body.height || 1080,
    audio_track: body.audio_track,
    status: 'draft'
  };

  const { data, error } = await sb.from('motion_projects').insert(record).select().single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
