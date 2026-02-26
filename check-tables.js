const{Client}=require('pg');
(async()=>{
  const c=new Client({connectionString:'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres',ssl:{rejectUnauthorized:false}});
  await c.connect();
  const{rows}=await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log(rows.map(r=>r.tablename).join('\n'));
  
  // Check columns on key tables
  for (const t of ['agents','trades','farms','farm_decisions','agent_thoughts','coordination_scratchpad']) {
    try {
      const {rows: cols} = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='${t}' ORDER BY ordinal_position`);
      console.log(`\n--- ${t} ---`);
      cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
    } catch(e) { console.log(`\n--- ${t}: ERROR ---`); }
  }
  await c.end();
})();
