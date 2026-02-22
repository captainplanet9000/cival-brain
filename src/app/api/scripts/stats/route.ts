import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();

  // Paginate scripts to get ALL (Supabase caps at 1000 per query)
  let allScripts: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page } = await sb.from('scripts')
      .select('id, framework_id, status, category, series_name, created_at')
      .range(offset, offset + pageSize - 1);
    allScripts = [...allScripts, ...(page || [])];
    if (!page || page.length < pageSize) break;
    offset += pageSize;
  }

  const [frameworksRes, generationsRes] = await Promise.all([
    sb.from('script_frameworks').select('id, name, slug'),
    sb.from('script_generations').select('id, created_at').order('created_at', { ascending: false }).limit(10),
  ]);

  const scripts = allScripts;
  const frameworks = frameworksRes.data || [];

  const byStatus: Record<string, number> = {};
  const byFramework: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  scripts.forEach((s: any) => {
    byStatus[s.status || 'draft'] = (byStatus[s.status || 'draft'] || 0) + 1;
    if (s.framework_id) byFramework[s.framework_id] = (byFramework[s.framework_id] || 0) + 1;
    if (s.category) byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  });

  const frameworkStats = frameworks.map((f: any) => ({
    ...f,
    count: byFramework[f.id] || 0,
  }));

  return NextResponse.json({
    total: scripts.length,
    byStatus,
    byFramework: frameworkStats,
    byCategory,
    recentGenerations: generationsRes.data || [],
    seriesCount: new Set(scripts.filter((s: any) => s.series_name).map((s: any) => s.series_name)).size,
  });
}
