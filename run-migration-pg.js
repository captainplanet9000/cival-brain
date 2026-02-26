const { Client } = require('pg');

const sql = `
CREATE TABLE IF NOT EXISTS motion_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  prompt_text text NOT NULL,
  category text NOT NULL DEFAULT 'custom',
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
  status text NOT NULL DEFAULT 'draft',
  prompt text NOT NULL DEFAULT '',
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
  status text NOT NULL DEFAULT 'pending',
  priority int DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  worker_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_motion_projects_status ON motion_projects(status);
CREATE INDEX IF NOT EXISTS idx_motion_queue_status ON motion_queue(status);
CREATE INDEX IF NOT EXISTS idx_motion_prompts_category ON motion_prompts(category);
`;

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres');
    await client.query(sql);
    console.log('Migration complete! Tables created.');
    
    // Verify
    const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'motion_%'");
    console.log('Motion tables:', res.rows.map(r => r.tablename));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
