import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vusjcfushwxwksfuszjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ'
);

const { data, error } = await supabase.rpc('exec_sql', {
  query: `
    CREATE TABLE IF NOT EXISTS calendar_items (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      item_date date NOT NULL,
      item_type text NOT NULL CHECK (item_type IN ('journal', 'task', 'doc')),
      label text NOT NULL,
      file_path text,
      content_preview text,
      synced_at timestamptz DEFAULT now(),
      UNIQUE(item_date, item_type, label)
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_items_date ON calendar_items(item_date);
  `
});

if (error) {
  console.log('RPC not available, trying direct SQL via management API...');
  // Try inserting a test row to see if table exists
  const { error: testErr } = await supabase.from('calendar_items').select('id').limit(1);
  if (testErr && testErr.message.includes('does not exist')) {
    console.log('Table does not exist. Please create it via Supabase Dashboard SQL editor:');
    console.log(`
CREATE TABLE calendar_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_date date NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('journal', 'task', 'doc')),
  label text NOT NULL,
  file_path text,
  content_preview text,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(item_date, item_type, label)
);
CREATE INDEX idx_calendar_items_date ON calendar_items(item_date);
    `);
  } else if (testErr) {
    console.log('Error:', testErr.message);
  } else {
    console.log('Table already exists!');
  }
} else {
  console.log('Table created successfully!');
}
