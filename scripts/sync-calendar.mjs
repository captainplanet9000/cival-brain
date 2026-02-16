#!/usr/bin/env node
// Sync calendar items to Supabase by calling the sync API endpoint
// Usage: node scripts/sync-calendar.mjs [base_url]

const baseUrl = process.argv[2] || 'http://localhost:3333';

async function main() {
  console.log(`Syncing calendar to Supabase via ${baseUrl}/api/calendar/sync ...`);
  const res = await fetch(`${baseUrl}/api/calendar/sync`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) {
    console.error('Sync failed:', data);
    process.exit(1);
  }
  console.log('Sync complete:', data);
}

main().catch(e => { console.error(e); process.exit(1); });
