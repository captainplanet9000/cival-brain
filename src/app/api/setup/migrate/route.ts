import { NextResponse } from 'next/server';
import pg from 'pg';

export async function POST() {
  const client = new pg.Client({
    host: 'db.vusjcfushwxwksfuszjv.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    await client.query(`CREATE TABLE IF NOT EXISTS marketing_tweets (
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
    );`);
    await client.end();
    return NextResponse.json({ ok: true, message: 'Table created' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
