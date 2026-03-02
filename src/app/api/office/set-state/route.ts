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
      .select('id, name, status')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('Supabase fetch error:', JSON.stringify(fetchError));
      throw new Error(fetchError.message || 'Failed to fetch agent');
    }

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

    // Update agent status (only columns that exist in the table)
    const { error: updateError } = await supabase
      .from('brain_agents')
      .update({ status })
      .eq('id', agent.id);

    if (updateError) {
      console.error('Supabase update error:', JSON.stringify(updateError));
      throw new Error(updateError.message || 'Failed to update agent');
    }

    return NextResponse.json({ success: true, state, detail });
  } catch (error) {
    console.error('Error setting office state:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to set state'
    }, { status: 500 });
  }
}
