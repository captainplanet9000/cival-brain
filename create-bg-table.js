const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vusjcfushwxwksfuszjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ'
);

async function main() {
  // Try to create table using rpc or direct query
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `CREATE TABLE IF NOT EXISTS public.background_prompts (
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
    );`
  });
  
  if (error) {
    console.log('RPC failed (expected):', error.message);
    // Try inserting a test row to see if table exists
    const { data: d2, error: e2 } = await supabase.from('background_prompts').select('id').limit(1);
    if (e2) {
      console.log('Table does not exist:', e2.message);
      console.log('Need to create it via Supabase SQL Editor or Management API');
    } else {
      console.log('Table already exists! Rows:', d2.length);
    }
  } else {
    console.log('Table created!', data);
  }
}

main();
