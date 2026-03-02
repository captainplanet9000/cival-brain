import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/office/status
 * Returns the main agent (orchestrator) status for the pixel office
 */
export async function GET() {
  const supabase = getServiceSupabase();

  try {
    const { data: agents, error } = await supabase
      .from('brain_agents')
      .select('id, name, status, description')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Supabase error:', JSON.stringify(error));
      throw new Error(error.message || 'Supabase query failed');
    }

    const agent = agents?.[0];
    if (!agent) {
      return NextResponse.json({
        state: 'idle',
        detail: 'No agents found'
      });
    }

    // Map brain agent status to office states
    const statusMap: Record<string, string> = {
      'active': 'writing',
      'running': 'writing',
      'analyzing': 'researching',
      'executing': 'executing',
      'trading': 'executing',
      'syncing': 'syncing',
      'error': 'error',
      'failed': 'error',
      'stopped': 'idle',
      'paused': 'idle',
      'idle': 'idle'
    };

    const state = statusMap[agent.status?.toLowerCase()] || 'idle';
    const detail = agent.description || agent.name || 'Standing by';

    return NextResponse.json({
      state,
      detail,
      agentId: agent.id,
      agentName: agent.name
    });
  } catch (error) {
    console.error('Error fetching office status:', error);
    return NextResponse.json({
      state: 'error',
      detail: 'Failed to fetch status'
    }, { status: 500 });
  }
}
