import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();

  const [agents, missions, events, units, content, revenue, proposals] = await Promise.all([
    sb.from('ops_agents').select('id', { count: 'exact', head: true }),
    sb.from('ops_missions').select('id', { count: 'exact', head: true }),
    sb.from('ops_agent_events').select('id', { count: 'exact', head: true }),
    sb.from('ops_business_units').select('id', { count: 'exact', head: true }),
    sb.from('ops_content_pipeline').select('id', { count: 'exact', head: true }),
    sb.from('revenue_entries').select('id, amount'),
    sb.from('ops_mission_proposals').select('id', { count: 'exact', head: true }),
  ]);

  const totalRevenue = (revenue.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  // Recent events
  const { data: recentEvents } = await sb.from('ops_agent_events').select('*').order('created_at', { ascending: false }).limit(5);

  return NextResponse.json({
    agents: agents.count || 0,
    missions: missions.count || 0,
    events: events.count || 0,
    units: units.count || 0,
    content: content.count || 0,
    revenue: totalRevenue,
    proposals: proposals.count || 0,
    recentEvents: recentEvents || [],
  });
}
