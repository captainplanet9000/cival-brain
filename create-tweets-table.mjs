// Try Supabase's newer SQL-over-HTTP endpoint
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ';
const projectRef = 'vusjcfushwxwksfuszjv';

const sql = `CREATE TABLE IF NOT EXISTS marketing_tweets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project TEXT NOT NULL DEFAULT 'the-400-club',
  content TEXT NOT NULL,
  tweet_type TEXT NOT NULL DEFAULT 'organic',
  category TEXT,
  hashtags TEXT[],
  media_notes TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  engagement_notes TEXT,
  thread_position INT,
  thread_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);`;

// Try the pg-meta endpoint (Supabase's metadata API)
const endpoints = [
  { url: `https://${projectRef}.supabase.co/pg`, method: 'POST', body: { query: sql } },
  { url: `https://${projectRef}.supabase.co/rest/v1/rpc`, method: 'POST', body: { query: sql } },
];

// Try pg-meta query endpoint
const res = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
  method: 'POST',
  headers: {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'x-connection-encrypted': 'false'
  },
  body: JSON.stringify({ query: sql })
});
console.log('pg/query:', res.status, (await res.text()).substring(0, 500));

// Also try the actual pg-meta endpoint format  
const res2 = await fetch(`https://${projectRef}.supabase.co/pg-meta/default/query`, {
  method: 'POST',
  headers: {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql })
});
console.log('pg-meta:', res2.status, (await res2.text()).substring(0, 500));
