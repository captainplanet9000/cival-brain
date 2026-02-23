// Run this with: node setup-db.js
// Creates the brain_agents, brain_conversations, and brain_messages tables in Supabase

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vusjcfushwxwksfuszjv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- Create brain_agents table
CREATE TABLE IF NOT EXISTS brain_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  color TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create brain_conversations table
CREATE TABLE IF NOT EXISTS brain_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES brain_agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create brain_messages table
CREATE TABLE IF NOT EXISTS brain_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES brain_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON brain_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON brain_conversations(agent_id, updated_at);
`;

async function setup() {
  try {
    // Try using Supabase RPC if available
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('RPC method failed:', error.message);
      console.log('\n⚠️  Please run the SQL in supabase-migration.sql manually in the Supabase SQL Editor.');
      console.log('Go to: https://supabase.com/dashboard/project/vusjcfushwxwksfuszjv/sql/new');
      process.exit(1);
    }
    
    console.log('✅ Tables created successfully!');
    console.log('Now run: curl -X POST http://localhost:3333/api/brain-agents/seed');
  } catch (err) {
    console.error('Setup error:', err);
    console.log('\n⚠️  Automated setup failed. Please manually run supabase-migration.sql in Supabase SQL Editor.');
    console.log('Go to: https://supabase.com/dashboard/project/vusjcfushwxwksfuszjv/sql/new');
  }
}

setup();
