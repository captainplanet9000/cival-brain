import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();

  // Get unique agents from events
  const { data: events } = await sb.from('ops_agent_events').select('agent_id, kind, title, summary, created_at').order('created_at', { ascending: false });

  const agentMap = new Map<string, any>();
  for (const e of events || []) {
    if (!agentMap.has(e.agent_id)) {
      agentMap.set(e.agent_id, {
        id: e.agent_id,
        name: e.title?.replace(' Online', '') || e.agent_id,
        lastEvent: e,
        eventCount: 0,
      });
    }
    agentMap.get(e.agent_id)!.eventCount++;
  }

  // Get memory counts per agent
  const { data: memories } = await sb.from('ops_agent_memory').select('agent_id');
  for (const m of memories || []) {
    if (agentMap.has(m.agent_id)) {
      const a = agentMap.get(m.agent_id)!;
      a.memoryCount = (a.memoryCount || 0) + 1;
    }
  }

  return NextResponse.json(Array.from(agentMap.values()));
}
