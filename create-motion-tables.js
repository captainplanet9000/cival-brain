const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://vusjcfushwxwksfuszjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ',
  { db: { schema: 'public' } }
);

async function createTables() {
  // Step 1: Create a temporary function to run our DDL
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION _tmp_create_motion_tables() RETURNS void AS $$
    BEGIN
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
    END;
    $$ LANGUAGE plpgsql;
  `;

  // Use the pg_net or direct SQL approach via supabase's sql endpoint
  // Actually, let's try the Supabase SQL API endpoint directly
  const res = await fetch('https://vusjcfushwxwksfuszjv.supabase.co/rest/v1/rpc/_tmp_create_motion_tables', {
    method: 'POST',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ',
      'Content-Type': 'application/json',
    },
    body: '{}'
  });
  
  if (!res.ok) {
    console.log('RPC approach failed, trying pg_query...');
    
    // Alternative: Use Supabase's pg endpoint (undocumented but works)
    const pgRes = await fetch('https://vusjcfushwxwksfuszjv.supabase.co/pg', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: createFnSQL })
    });
    
    if (!pgRes.ok) {
      // Last resort: use supabase CLI
      console.log('pg endpoint also failed. Trying supabase db query...');
      const { execSync } = require('child_process');
      try {
        // Use the database connection string directly with psql
        const connStr = `postgresql://postgres.vusjcfushwxwksfuszjv:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
        console.log('Need DB password. Checking if supabase CLI is available...');
        
        // Try npx supabase
        const result = execSync('npx supabase --version 2>&1', { encoding: 'utf-8', timeout: 30000 });
        console.log('Supabase CLI:', result.trim());
        
        // Link and run migration
        console.log('Attempting to use supabase db push...');
      } catch (e) {
        console.log('No CLI available. Creating an API endpoint to run the migration instead.');
        
        // Create an API route that creates the tables
        const fs = require('fs');
        const migrationRoute = `import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST() {
  const sb = getServiceSupabase();
  
  // Test if tables already exist
  const { error: testErr } = await sb.from('motion_projects').select('id').limit(1);
  if (!testErr) {
    return NextResponse.json({ message: 'Tables already exist' });
  }
  
  // Tables don't exist — we can't create them via PostgREST
  // Return the SQL for manual execution
  return NextResponse.json({ 
    error: 'Tables do not exist. Run migration SQL in Supabase Dashboard.',
    sql_url: 'https://supabase.com/dashboard/project/vusjcfushwxwksfuszjv/sql/new'
  }, { status: 500 });
}`;
        console.log('\nCannot create tables via REST API — PostgREST only does CRUD, not DDL.');
        console.log('The migration MUST be run via:');
        console.log('1. Supabase Dashboard SQL Editor');
        console.log('2. psql connection');
        console.log('3. supabase db push CLI');
      }
    }
  } else {
    console.log('Tables created!');
  }
}

createTables();
