const dns = require('dns');
dns.setDefaultResultOrder('verbatim');
const pg = require('pg');

async function main() {
  const client = new pg.Client({
    host: 'db.vusjcfushwxwksfuszjv.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log('Connected to database');

  await client.query(`
    CREATE TABLE IF NOT EXISTS background_prompts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      mood TEXT NOT NULL,
      style TEXT NOT NULL,
      color_palette TEXT,
      motion_type TEXT DEFAULT 'slow',
      format TEXT DEFAULT '9:16 vertical',
      loop_friendly BOOLEAN DEFAULT true,
      caption_safe BOOLEAN DEFAULT true,
      platform TEXT DEFAULT 'higgsfield',
      tags TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'draft',
      usage_count INTEGER DEFAULT 0,
      last_used_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Table created');

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
