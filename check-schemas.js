const{Client}=require('pg');
const c=new Client({connectionString:'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres',ssl:{rejectUnauthorized:false}});
c.connect().then(async()=>{
  const tables = ['revenue_entries','ops_events','ops_agents','ops_proposals','ops_missions','ops_mission_steps','ops_business_units','ops_content_pipeline','ops_agent_events','ops_agent_memory','ops_mission_proposals','mc_tasks'];
  for(const t of tables){
    const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='${t}' AND table_schema='public' ORDER BY ordinal_position`);
    console.log(`\n=== ${t} ===`);
    if(r.rows.length===0) console.log('(no columns / table not found)');
    else r.rows.forEach(row=>console.log(`  ${row.column_name}: ${row.data_type}`));
  }
  // Also check row counts
  console.log('\n=== ROW COUNTS ===');
  for(const t of tables){
    try{
      const r = await c.query(`SELECT count(*) FROM ${t}`);
      console.log(`  ${t}: ${r.rows[0].count}`);
    }catch(e){console.log(`  ${t}: ERROR - ${e.message}`);}
  }
  c.end();
}).catch(e=>{console.error(e);c.end()});
