import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();

  const { data, error } = await sb
    .from('motion_queue')
    .select(`
      *,
      motion_projects!inner(title, status)
    `)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();

  if (!body.project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 });
  }

  const queueEntry = {
    project_id: body.project_id,
    priority: body.priority || 0,
    status: 'pending'
  };

  const { data, error } = await sb
    .from('motion_queue')
    .insert(queueEntry)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb
    .from('motion_projects')
    .update({ status: 'queued', updated_at: new Date().toISOString() })
    .eq('id', body.project_id);

  return NextResponse.json(data);
}
