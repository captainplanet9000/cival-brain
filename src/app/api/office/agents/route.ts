import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/office/agents
 * Returns all brain agents with their office positions
 */
export async function GET() {
  const supabase = getServiceSupabase();

  try {
    const { data: agents, error } = await supabase
      .from('brain_agents')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Map brain agent status to office areas
    const statusToArea: Record<string, string> = {
      'active': 'writing',
      'running': 'writing',
      'analyzing': 'researching',
      'executing': 'writing',
      'trading': 'writing',
      'syncing': 'writing',
      'error': 'error',
      'failed': 'error',
      'stopped': 'breakroom',
      'paused': 'breakroom',
      'idle': 'breakroom'
    };

    const statusToState: Record<string, string> = {
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

    // Transform agents for office display
    const officeAgents = (agents || []).map((agent, index) => {
      const status = agent.status?.toLowerCase() || 'idle';
      const area = statusToArea[status] || 'breakroom';
      const state = statusToState[status] || 'idle';

      return {
        agentId: agent.id,
        name: agent.name || `Agent ${index + 1}`,
        isMain: index === 0, // First agent is main
        state,
        detail: agent.current_task || agent.description || 'Standing by',
        area,
        authStatus: 'approved',
        updated_at: agent.updated_at || new Date().toISOString(),
        emoji: agent.emoji || '🤖',
        bubbleText: agent.current_task || `${agent.name} is ${state}`
      };
    });

    return NextResponse.json(officeAgents);
  } catch (error) {
    console.error('Error fetching office agents:', error);
    return NextResponse.json([], { status: 500 });
  }
}
