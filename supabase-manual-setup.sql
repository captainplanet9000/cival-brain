-- Run this SQL in the Supabase Dashboard SQL Editor
-- Project: https://vusjcfushwxwksfuszjv.supabase.co

-- Add missing columns to existing tables
ALTER TABLE ops_business_units ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';
ALTER TABLE ops_business_units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update categories for existing business units
UPDATE ops_business_units SET category = 'trading' WHERE slug = 'cival-dashboard';
UPDATE ops_business_units SET category = 'content' WHERE slug IN ('honey-bunny', 'clay-verse', 'hunni-bunni-kitchen', 'what-i-need-to-hear', 'gwds-tiktok-1', 'gwds-tiktok-2', 'gwds-tiktok-3');
UPDATE ops_business_units SET category = 'nft' WHERE slug = 'the-400-club';

-- Create ops_agents table
CREATE TABLE IF NOT EXISTS ops_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  capabilities JSONB DEFAULT '[]',
  memory JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ops_proposals table
CREATE TABLE IF NOT EXISTS ops_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  proposed_by UUID REFERENCES ops_agents(id),
  business_unit_id UUID REFERENCES ops_business_units(id),
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ops_events table
CREATE TABLE IF NOT EXISTS ops_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  agent_id UUID REFERENCES ops_agents(id),
  mission_id UUID REFERENCES ops_missions(id),
  business_unit_id UUID REFERENCES ops_business_units(id),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create content_pipeline table
CREATE TABLE IF NOT EXISTS content_pipeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_unit_id UUID REFERENCES ops_business_units(id),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idea',
  script TEXT,
  media_urls JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create revenue_entries table
CREATE TABLE IF NOT EXISTS revenue_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_unit_id UUID REFERENCES ops_business_units(id),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  source TEXT,
  description TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE ops_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

-- Permissive policies
DO $$ 
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['ops_agents','ops_proposals','ops_events','content_pipeline','revenue_entries'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_select" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_insert" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_update" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_delete" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all_select" ON %I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "allow_all_insert" ON %I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "allow_all_update" ON %I FOR UPDATE USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "allow_all_delete" ON %I FOR DELETE USING (true)', t);
  END LOOP;
END $$;

-- Seed agents
INSERT INTO ops_agents (name, role, description) VALUES
  ('Coordinator', 'coordinator', 'Orchestrates operations, assigns missions, monitors progress'),
  ('Content Creator', 'content_creator', 'Generates scripts, manages content pipeline across all channels'),
  ('Observer', 'observer', 'Monitors systems, tracks metrics, raises alerts')
ON CONFLICT DO NOTHING;
