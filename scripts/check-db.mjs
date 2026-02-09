import pg from 'pg';
const c = new pg.Client({connectionString:'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres',ssl:{rejectUnauthorized:false}});
await c.connect();
console.log('frameworks:', (await c.query('SELECT count(*) FROM script_frameworks')).rows[0].count);
console.log('scripts:', (await c.query('SELECT count(*) FROM scripts')).rows[0].count);
await c.end();
