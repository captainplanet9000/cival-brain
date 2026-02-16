import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'public' } }
  );

  // First check if table exists
  const { error: checkErr } = await sb.from('marketing_tweets').select('id').limit(1);
  
  if (!checkErr) {
    return NextResponse.json({ message: 'Table already exists' });
  }

  // Table doesn't exist - we need to create it via raw SQL
  // Supabase JS client doesn't support DDL, so we'll use the postgres protocol
  // via the supabase-js rpc mechanism with a custom function
  
  // Alternative: use fetch to the Supabase SQL API
  const sqlRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/create_marketing_tweets_table`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  return NextResponse.json({ 
    tableExists: false,
    message: 'Table needs to be created via Supabase SQL Editor. Run this SQL:',
    sql: `CREATE TABLE IF NOT EXISTS marketing_tweets (
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
);`
  });
}
