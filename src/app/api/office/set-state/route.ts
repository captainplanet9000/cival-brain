import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/office/set-state
 * Updates the main agent's state (for testing)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { state, detail } = body;

    if (!state) {
      return NextResponse.json({ error: 'state required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Get the first agent (main agent)
    const { data: agents, error: fetchError } = await supabase
      .from('brain_agents')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) throw fetchError;

    const agent = agents?.[0];
    if (!agent) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    // Map office state back to brain agent status
    const stateToStatus: Record<string, string> = {
      'idle': 'idle',
      'writing': 'active',
      'researching': 'analyzing',
      'executing': 'executing',
      'syncing': 'syncing',
      'error': 'error'
    };

    const status = stateToStatus[state] || 'idle';

    // Update agent status
    const { error: updateError } = await supabase
      .from('brain_agents')
      .update({
        status,
        current_task: detail || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, state, detail });
  } catch (error) {
    console.error('Error setting office state:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to set state'
    }, { status: 500 });
  }
}
