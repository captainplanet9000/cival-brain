import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const status = req.nextUrl.searchParams.get('status');
  const buId = req.nextUrl.searchParams.get('business_unit_id');
  let q = sb.from('marketing_campaigns').select('*, ops_business_units(name)').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  if (buId) q = q.eq('business_unit_id', buId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { data, error } = await sb.from('marketing_campaigns').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { id, ...rest } = body;
  rest.updated_at = new Date().toISOString();
  const { data, error } = await sb.from('marketing_campaigns').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = getServiceSupabase();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await sb.from('marketing_campaigns').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
