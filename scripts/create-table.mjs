// Login to Supabase Management API via GitHub OAuth
// Then create the table via the Management API SQL endpoint

const GITHUB_PAT = process.env.GITHUB_PAT || '';
const PROJECT_REF = 'vusjcfushwxwksfuszjv';

// Step 1: Try Supabase Management API with access token from CLI login
// Actually, let's try using the Supabase CLI login with a token
// First check if we have a stored token

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Check for supabase access token in common locations
const homeDir = process.env.USERPROFILE || process.env.HOME;
const tokenPaths = [
  path.join(homeDir, '.supabase', 'access-token'),
  path.join(homeDir, 'AppData', 'Roaming', 'supabase', 'access-token'),
];

let accessToken = null;
for (const p of tokenPaths) {
  try {
    accessToken = fs.readFileSync(p, 'utf-8').trim();
    console.log(`Found token at ${p}`);
    break;
  } catch {}
}

if (!accessToken) {
  console.log('No Supabase access token found. Trying to get one via npx supabase login...');
  // Try to generate a token via the Supabase API using GitHub
  // Actually, let's just use the Supabase Management API v1 endpoint
  // which accepts the service role key for some operations
  
  // Alternative: Use Supabase's internal database connection via the REST API 
  // by creating a database function through the API
  console.log('Will create table via a bootstrap API route instead.');
  process.exit(1);
}

// Use Management API to execute SQL
const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
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
  }),
});

console.log('Status:', res.status);
console.log('Response:', await res.text());
