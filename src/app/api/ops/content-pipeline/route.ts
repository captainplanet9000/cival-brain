import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const stage = req.nextUrl.searchParams.get('stage');
  const channel = req.nextUrl.searchParams.get('channel');
  const buId = req.nextUrl.searchParams.get('business_unit_id');
  let q = sb.from('ops_content_pipeline').select('*, ops_business_units(name, icon, slug)').order('updated_at', { ascending: false });
  if (stage) q = q.eq('stage', stage);
  if (channel) q = q.eq('channel', channel);
  if (buId) q = q.eq('business_unit_id', buId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { data, error } = await sb.from('ops_content_pipeline').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { id, ...updates } = body;
  updates.updated_at = new Date().toISOString();
  const { data, error } = await sb.from('ops_content_pipeline').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
