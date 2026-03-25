import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const url = new URL(req.url);
  const framework_id = url.searchParams.get('framework_id');
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const series_name = url.searchParams.get('series_name');
  const search = url.searchParams.get('search');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Try embedded join first, fall back to separate lookup if FK doesn't exist
  let data: any[] | null = null;
  let count: number | null = null;
  let joinFailed = false;

  try {
    let query = sb.from('scripts').select('*, script_frameworks(name, slug, channel)', { count: 'exact' });
    if (framework_id) query = query.eq('framework_id', framework_id);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (series_name) query = query.eq('series_name', series_name);
    if (search) query = query.or(`title.ilike.%${search}%,script_content.ilike.%${search}%`);

    const result = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (result.error) throw result.error;
    data = result.data;
    count = result.count;
  } catch {
    joinFailed = true;
  }

  // Fallback: query without join, then manually attach framework info
  if (joinFailed) {
    let query = sb.from('scripts').select('*', { count: 'exact' });
    if (framework_id) query = query.eq('framework_id', framework_id);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (series_name) query = query.eq('series_name', series_name);
    if (search) query = query.or(`title.ilike.%${search}%,script_content.ilike.%${search}%`);

    const result = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    data = result.data;
    count = result.count;

    // Lookup frameworks for enrichment
    const fwIds = [...new Set((data || []).map((s: any) => s.framework_id).filter(Boolean))];
    if (fwIds.length > 0) {
      const { data: frameworks } = await sb.from('script_frameworks').select('id, name, slug, channel').in('id', fwIds);
      const fwMap = new Map((frameworks || []).map((f: any) => [f.id, { name: f.name, slug: f.slug, channel: f.channel }]));
      data = (data || []).map((s: any) => ({ ...s, script_frameworks: fwMap.get(s.framework_id) || null }));
    }
  }

  return NextResponse.json({ data, count });
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();

  // Calculate word count and duration
  const content = body.script_content || '';
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.round(wordCount / 2.5); // ~150 WPM

  const record = {
    ...body,
    word_count: body.word_count || wordCount,
    estimated_duration_secs: body.estimated_duration_secs || estimatedDuration,
  };

  const { data, error } = await sb.from('scripts').insert(record).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await sb.from('scripts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = getServiceSupabase();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await sb.from('scripts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
