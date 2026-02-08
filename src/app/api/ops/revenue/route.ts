import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const buId = req.nextUrl.searchParams.get('business_unit_id');
  let q = sb.from('revenue_entries').select('*').order('recorded_at', { ascending: false });
  if (buId) q = q.eq('business_unit_id', buId);
  const { data, error } = await q;
  if (error) {
    // Table may not exist yet
    if (error.code === 'PGRST205') {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { data, error } = await sb.from('revenue_entries').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
