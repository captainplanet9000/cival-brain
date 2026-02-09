import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const channelId = req.nextUrl.searchParams.get('channel_id');
  const contentId = req.nextUrl.searchParams.get('content_id');
  let q = sb.from('marketing_performance').select('*').order('date', { ascending: false }).limit(100);
  if (channelId) q = q.eq('channel_id', channelId);
  if (contentId) q = q.eq('content_id', contentId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { data, error } = await sb.from('marketing_performance').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
