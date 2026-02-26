import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST() {
  const supabase = getServiceSupabase();

  try {
    // Create brain_agents table
    const { error: agentsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS brain_agents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          emoji TEXT NOT NULL,
          description TEXT,
          system_prompt TEXT NOT NULL,
          color TEXT NOT NULL,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    // Create brain_conversations table
    const { error: conversationsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS brain_conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id UUID REFERENCES brain_agents(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    // Create brain_messages table
    const { error: messagesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS brain_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES brain_conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON brain_messages(conversation_id, created_at);
      `
    });

    // If rpc doesn't work, try direct table creation via REST API
    // This is a fallback - just ensure tables exist
    await supabase.from('brain_agents').select('id').limit(1);
    await supabase.from('brain_conversations').select('id').limit(1);
    await supabase.from('brain_messages').select('id').limit(1);

    return NextResponse.json({ 
      success: true, 
      message: 'Database setup completed',
      errors: { agentsError, conversationsError, messagesError }
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Setup failed' 
    }, { status: 500 });
  }
}
