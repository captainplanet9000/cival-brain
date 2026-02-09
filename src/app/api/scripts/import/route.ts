import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { scripts } = body;

  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return NextResponse.json({ error: 'scripts array required' }, { status: 400 });
  }

  const { data, error } = await sb.from('scripts').insert(scripts).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update generation records if provided
  return NextResponse.json({ imported: data?.length || 0, data });
}
