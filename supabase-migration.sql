-- Cival Brain Multi-Agent Chat System
-- Run this in Supabase SQL Editor to create the required tables

-- Create brain_agents table
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
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON brain_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON brain_conversations(agent_id, updated_at);

-- Enable RLS (optional - you can disable if you want simpler setup)
ALTER TABLE brain_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_messages ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - adjust as needed)
CREATE POLICY "Allow all on brain_agents" ON brain_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on brain_conversations" ON brain_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on brain_messages" ON brain_messages FOR ALL USING (true) WITH CHECK (true);
