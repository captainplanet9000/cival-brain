-- Motion Graphics Studio Tables

CREATE TABLE IF NOT EXISTS motion_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  prompt_text text NOT NULL,
  category text NOT NULL DEFAULT 'custom' CHECK (category IN ('launch','demo','showcase','tiktok','explainer','nft','custom')),
  tags text[] DEFAULT '{}',
  scene_template jsonb DEFAULT '{}',
  usage_count int DEFAULT 0,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS motion_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','rendering','rendered','failed')),
  prompt text NOT NULL,
  scene_config jsonb DEFAULT '{}',
  brand_config jsonb DEFAULT '{}',
  duration_secs int DEFAULT 30,
  fps int DEFAULT 30,
  width int DEFAULT 1920,
  height int DEFAULT 1080,
  audio_track text,
  render_output_path text,
  render_file_size bigint,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS motion_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES motion_projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  priority int DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  worker_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_motion_projects_status ON motion_projects(status);
CREATE INDEX idx_motion_queue_status ON motion_queue(status);
CREATE INDEX idx_motion_prompts_category ON motion_prompts(category);
