import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();

  const { data: all, error } = await sb.from('background_prompts').select('id, category, mood, style, status, created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = all || [];
  const total = items.length;

  const countBy = (key: string) => {
    const map: Record<string, number> = {};
    items.forEach((item: any) => { map[item[key]] = (map[item[key]] || 0) + 1; });
    return map;
  };

  const byCategory = countBy('category');
  const byMood = countBy('mood');
  const byStyle = countBy('style');
  const byStatus = countBy('status');

  // Recent (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentCount = items.filter((i: any) => i.created_at > weekAgo).length;

  return NextResponse.json({ total, byCategory, byMood, byStyle, byStatus, recentCount });
}
