// Use the Supabase Management API v1 to run SQL
// Ref: https://supabase.com/docs/reference/api/v1/run-a-query
const fetch = globalThis.fetch;

async function run() {
  const projectRef = 'vusjcfushwxwksfuszjv';
  
  // Get access token from supabase CLI config
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  
  // Check for stored access token
  let accessToken;
  const configPaths = [
    path.join(os.homedir(), '.supabase', 'config.toml'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'supabase', 'config.toml'),
    path.join(os.homedir(), '.config', 'supabase', 'config.toml'),
  ];
  
  for (const p of configPaths) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      const match = content.match(/access_token\s*=\s*"?([^"\n]+)"?/);
      if (match) {
        accessToken = match[1].trim();
        console.log('Found access token in', p);
        break;
      }
    } catch {}
  }
  
  if (!accessToken) {
    console.log('No access token found. Checking env...');
    accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  }
  
  if (!accessToken) {
    console.log('ERROR: No Supabase access token found.');
    console.log('Run: npx supabase login');
    console.log('Or set SUPABASE_ACCESS_TOKEN env var');
    return;
  }

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
  `;

  console.log('Running migration against', projectRef, '...');
  
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await res.text();
  if (res.ok) {
    console.log('SUCCESS! Tables created.');
    console.log(text);
  } else {
    console.log(`Failed (${res.status}):`, text);
  }
}

run().catch(console.error);
