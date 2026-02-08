const{Client}=require('pg');
const c=new Client({connectionString:'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres',ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).then(r=>{console.log(r.rows.map(x=>x.tablename).join('\n'));c.end()}).catch(e=>{console.error(e);c.end()});
