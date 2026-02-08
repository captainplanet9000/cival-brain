const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to Supabase Postgres');
  
  const sql = fs.readFileSync('migrations/001_ops_tables.sql', 'utf8');
  await client.query(sql);
  console.log('Migration complete!');
  
  // Verify
  const res = await client.query("SELECT count(*) FROM ops_business_units");
  console.log('Business units:', res.rows[0].count);
  const res2 = await client.query("SELECT count(*) FROM ops_agent_events");
  console.log('Agent events:', res2.rows[0].count);
  const res3 = await client.query("SELECT count(*) FROM ops_policy");
  console.log('Policies:', res3.rows[0].count);
  
  await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
