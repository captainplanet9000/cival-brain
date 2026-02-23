import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const supabase = getServiceSupabase();
    
    // Fetch scripts
    const { data: scripts, error: scriptsError } = await supabase
      .from('scripts')
      .select('id, title, category, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    // Fetch marketing campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch content pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('content_pipeline')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);

    // Aggregate by project and status
    const scriptsByCategory = scripts?.reduce((acc: Record<string, any[]>, s: any) => {
      const cat = s.category || 'uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {}) || {};

    const scriptsByStatus = scripts?.reduce((acc: Record<string, number>, s: any) => {
      const status = s.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}) || {};

    const campaignsByPlatform = campaigns?.reduce((acc: Record<string, number>, c: any) => {
      const platform = c.platform || 'unknown';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {}) || {};

    // Build calendar view (group by date)
    const calendar: Record<string, any[]> = {};
    
    // Add scripts to calendar
    scripts?.forEach((s: any) => {
      const date = s.created_at?.split('T')[0] || 'unknown';
      if (!calendar[date]) calendar[date] = [];
      calendar[date].push({
        type: 'script',
        project: s.category || 'uncategorized',
        status: s.status || 'draft',
        title: s.title,
      });
    });

    // Add campaigns to calendar
    campaigns?.forEach((c: any) => {
      const date = c.start_date?.split('T')[0] || c.created_at?.split('T')[0] || 'unknown';
      if (!calendar[date]) calendar[date] = [];
      calendar[date].push({
        type: 'campaign',
        project: c.platform || 'unknown',
        status: c.status || 'active',
        title: c.name || c.campaign_name,
      });
    });

    return NextResponse.json({
      calendar,
      stats: {
        total_scripts: scripts?.length || 0,
        total_campaigns: campaigns?.length || 0,
        total_pipeline: pipeline?.length || 0,
        scripts_by_status: scriptsByStatus,
        scripts_by_category: Object.keys(scriptsByCategory).reduce((acc: Record<string, number>, cat) => {
          acc[cat] = scriptsByCategory[cat].length;
          return acc;
        }, {}),
        campaigns_by_platform: campaignsByPlatform,
      },
    });
  } catch (error) {
    console.error('Content calendar error:', error);
    return NextResponse.json({
      calendar: {},
      stats: {},
      error: error instanceof Error ? error.message : 'Unknown error fetching content calendar',
    }, { status: 500 });
  }
}
