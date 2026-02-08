import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();

  // Get agents from ops_agents table first
  const { data: dbAgents } = await sb.from('ops_agents').select('*').order('name');

  if (dbAgents && dbAgents.length > 0) {
    // Enrich with event counts
    const { data: events } = await sb.from('ops_agent_events').select('agent_id');
    const { data: memories } = await sb.from('ops_agent_memory').select('agent_id');

    const eventCounts: Record<string, number> = {};
    (events || []).forEach((e: any) => { eventCounts[e.agent_id] = (eventCounts[e.agent_id] || 0) + 1; });
    const memoryCounts: Record<string, number> = {};
    (memories || []).forEach((m: any) => { memoryCounts[m.agent_id] = (memoryCounts[m.agent_id] || 0) + 1; });

    return NextResponse.json(dbAgents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      description: a.description,
      status: a.status || 'active',
      capabilities: a.capabilities,
      config: a.config,
      last_active_at: a.last_active_at,
      eventCount: eventCounts[a.id] || eventCounts[a.name] || 0,
      memoryCount: memoryCounts[a.id] || memoryCounts[a.name] || 0,
    })));
  }

  // Fallback: derive from events
  const { data: events } = await sb.from('ops_agent_events').select('agent_id, kind, title, summary, created_at').order('created_at', { ascending: false });
  const agentMap = new Map<string, any>();
  for (const e of events || []) {
    if (!agentMap.has(e.agent_id)) {
      agentMap.set(e.agent_id, { id: e.agent_id, name: e.title?.replace(' Online', '') || e.agent_id, lastEvent: e, eventCount: 0 });
    }
    agentMap.get(e.agent_id)!.eventCount++;
  }

  const { data: memories } = await sb.from('ops_agent_memory').select('agent_id');
  for (const m of memories || []) {
    if (agentMap.has(m.agent_id)) {
      agentMap.get(m.agent_id)!.memoryCount = (agentMap.get(m.agent_id)!.memoryCount || 0) + 1;
    }
  }

  return NextResponse.json(Array.from(agentMap.values()));
}
