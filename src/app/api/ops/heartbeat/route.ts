import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();
  const now = new Date();

  // Check trigger rules
  const { data: rules } = await sb.from('ops_trigger_rules').select('*').eq('enabled', true);
  const fired: string[] = [];

  for (const rule of rules || []) {
    if (rule.last_fired_at) {
      const lastFired = new Date(rule.last_fired_at);
      const cooldownMs = (rule.cooldown_minutes || 60) * 60000;
      if (now.getTime() - lastFired.getTime() < cooldownMs) continue;
    }
    // Mark as fired
    await sb.from('ops_trigger_rules').update({
      fire_count: (rule.fire_count || 0) + 1,
      last_fired_at: now.toISOString()
    }).eq('id', rule.id);
    fired.push(rule.name);
  }

  // Process queued mission steps
  const { data: queued } = await sb.from('ops_mission_steps').select('*, ops_missions(title)').eq('status', 'queued').limit(5);

  // Get system stats
  const { count: eventCount } = await sb.from('ops_agent_events').select('*', { count: 'exact', head: true });
  const { count: missionCount } = await sb.from('ops_missions').select('*', { count: 'exact', head: true }).eq('status', 'approved');
  const { count: contentCount } = await sb.from('ops_content_pipeline').select('*', { count: 'exact', head: true });

  return NextResponse.json({
    timestamp: now.toISOString(),
    triggers_fired: fired,
    queued_steps: queued?.length || 0,
    stats: { events: eventCount, active_missions: missionCount, content_items: contentCount }
  });
}
