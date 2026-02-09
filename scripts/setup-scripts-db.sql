-- Script frameworks/templates
CREATE TABLE IF NOT EXISTS script_frameworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  channel TEXT NOT NULL,
  framework_type TEXT NOT NULL,
  structure JSONB NOT NULL,
  example_prompt TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generated/stored scripts
CREATE TABLE IF NOT EXISTS scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  framework_id UUID REFERENCES script_frameworks(id),
  business_unit_id UUID REFERENCES ops_business_units(id),
  category TEXT,
  series_name TEXT,
  episode_number INT,
  status TEXT DEFAULT 'draft',
  script_content TEXT NOT NULL,
  tts_content TEXT,
  music_prompt TEXT,
  video_prompt TEXT,
  visual_prompts JSONB DEFAULT '[]',
  word_count INT,
  estimated_duration_secs INT,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Script generation history
CREATE TABLE IF NOT EXISTS script_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id UUID REFERENCES script_frameworks(id),
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'openclaw',
  result_script_id UUID REFERENCES scripts(id),
  generation_params JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE script_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_generations ENABLE ROW LEVEL SECURITY;

-- Permissive policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'script_frameworks_all') THEN
    CREATE POLICY script_frameworks_all ON script_frameworks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'scripts_all') THEN
    CREATE POLICY scripts_all ON scripts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'script_generations_all') THEN
    CREATE POLICY script_generations_all ON script_generations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
