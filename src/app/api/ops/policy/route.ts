import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();
  const { data, error } = await sb.from('ops_policy').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { key, value } = body;
  const { data, error } = await sb.from('ops_policy').upsert({ key, value, updated_at: new Date().toISOString() }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
