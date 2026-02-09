import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const status = req.nextUrl.searchParams.get('status');
  const platform = req.nextUrl.searchParams.get('platform');
  const buId = req.nextUrl.searchParams.get('business_unit_id');
  const campaignId = req.nextUrl.searchParams.get('campaign_id');
  let q = sb.from('marketing_content').select('*, ops_business_units(name), marketing_campaigns(name)').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  if (platform) q = q.eq('platform', platform);
  if (buId) q = q.eq('business_unit_id', buId);
  if (campaignId) q = q.eq('campaign_id', campaignId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { data, error } = await sb.from('marketing_content').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { id, ...rest } = body;
  rest.updated_at = new Date().toISOString();
  const { data, error } = await sb.from('marketing_content').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = getServiceSupabase();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await sb.from('marketing_content').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
