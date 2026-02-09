import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres' });

await c.connect();

await c.query(`
  CREATE TABLE IF NOT EXISTS marketing_job_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID REFERENCES marketing_content(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    skill_required TEXT,
    tool TEXT,
    assigned_to TEXT DEFAULT 'unassigned',
    status TEXT DEFAULT 'todo',
    sort_order INT DEFAULT 0,
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);

await c.query(`ALTER TABLE marketing_job_tasks ENABLE ROW LEVEL SECURITY`);
try {
  await c.query(`CREATE POLICY "allow_all_marketing_job_tasks" ON marketing_job_tasks FOR ALL USING (true) WITH CHECK (true)`);
} catch(e) { console.log('Policy exists'); }

console.log('Done!');
await c.end();
