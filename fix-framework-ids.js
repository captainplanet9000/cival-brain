const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://vusjcfushwxwksfuszjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ'
);

async function run() {
  // Get framework IDs
  const { data: fws } = await sb.from('script_frameworks').select('id, slug');
  console.log('Frameworks:', fws);
  
  const tensionId = fws.find(f => f.slug === 'tension')?.id;
  const claymationId = fws.find(f => f.slug === 'claymation')?.id;
  
  if (!tensionId || !claymationId) {
    console.log('Missing framework IDs!');
    return;
  }

  // Count scripts with null framework_id
  const { count } = await sb.from('scripts').select('id', { count: 'exact', head: true }).is('framework_id', null);
  console.log(`Scripts with null framework_id: ${count}`);

  // Update Clay Verse series/horror/POV scripts -> tension framework
  // These have metadata.channel = "clayverse" or categories like Horror, Comedy, POV Horror, etc.
  const { data: nullScripts } = await sb.from('scripts')
    .select('id, category, metadata')
    .is('framework_id', null)
    .limit(1000);

  let tensionCount = 0;
  let claymationCount = 0;
  
  for (const s of nullScripts || []) {
    const channel = s.metadata?.channel;
    const format = s.metadata?.format;
    
    let fwId;
    if (channel === 'clayverse') {
      // Series and story scripts go to tension, skits to claymation
      if (format === 'standalone_skit' || format === 'skit_comedy' || format === 'skit_horror' || 
          format === 'skit_action' || format === 'skit_whatif' || format === 'compilation' ||
          format === 'action_clip' || format === 'heartfelt' || format === 'parody') {
        fwId = claymationId;
        claymationCount++;
      } else {
        fwId = tensionId;
        tensionCount++;
      }
    } else if (s.category?.toLowerCase().includes('comedy') || s.category?.toLowerCase().includes('parody')) {
      fwId = claymationId;
      claymationCount++;
    } else {
      fwId = tensionId;
      tensionCount++;
    }
    
    await sb.from('scripts').update({ framework_id: fwId }).eq('id', s.id);
  }
  
  console.log(`Updated: ${tensionCount} -> tension, ${claymationCount} -> claymation`);
  
  // Verify
  const { count: remaining } = await sb.from('scripts').select('id', { count: 'exact', head: true }).is('framework_id', null);
  console.log(`Remaining null framework_id: ${remaining}`);
}

run();
