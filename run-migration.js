const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://vusjcfushwxwksfuszjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ'
);

async function run() {
  // Create tables via rpc (SQL)
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
      status text NOT NULL DEFAULT 'pending',
      priority int DEFAULT 0,
      started_at timestamptz,
      completed_at timestamptz,
      error_message text,
      worker_info jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now()
    );
  `;

  // Try using rpc to run SQL
  const { data, error } = await sb.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.log('RPC not available, trying direct table creation...');
    
    // Test if tables exist by trying to select
    const { error: e1 } = await sb.from('motion_projects').select('id').limit(1);
    if (e1) {
      console.log('motion_projects missing:', e1.message);
      console.log('\n=== MANUAL ACTION NEEDED ===');
      console.log('Run this SQL in Supabase Dashboard > SQL Editor:');
      console.log('https://supabase.com/dashboard/project/vusjcfushwxwksfuszjv/sql/new');
      console.log('\n' + sql);
    } else {
      console.log('Tables already exist!');
    }
  } else {
    console.log('Migration complete!', data);
  }
}

run();
