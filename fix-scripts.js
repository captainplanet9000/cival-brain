const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://vusjcfushwxwksfuszjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ'
);

async function run() {
  // Step 1: Find and delete all the badly imported scripts (ones with metadata.batch)
  console.log('Finding badly imported scripts...');
  
  let deleted = 0;
  let offset = 0;
  
  while (true) {
    const { data, error } = await sb.from('scripts')
      .select('id, title, metadata')
      .not('metadata', 'is', null)
      .range(offset, offset + 999);
    
    if (error) { console.log('Error:', error.message); break; }
    if (!data || data.length === 0) break;
    
    const toDelete = data.filter(s => {
      const m = s.metadata;
      if (!m) return false;
      // Delete scripts from our batch imports (have batch field in metadata)
      return m.batch && m.batch.startsWith('batch_');
    });
    
    if (toDelete.length > 0) {
      const ids = toDelete.map(s => s.id);
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const { error: delErr } = await sb.from('scripts').delete().in('id', chunk);
        if (delErr) console.log('Delete error:', delErr.message);
        else deleted += chunk.length;
      }
    }
    
    offset += data.length;
    if (data.length < 1000) break;
  }
  
  console.log(`Deleted ${deleted} badly imported scripts`);
  
  // Also delete scripts with title "Clay Verse Script" or "Series Script" (generic names)
  let moreDeleted = 0;
  for (const badTitle of ['Clay Verse Script', 'Series Script']) {
    const { data } = await sb.from('scripts').select('id').eq('title', badTitle);
    if (data && data.length > 0) {
      const ids = data.map(s => s.id);
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        await sb.from('scripts').delete().in('id', chunk);
        moreDeleted += chunk.length;
      }
    }
  }
  console.log(`Deleted ${moreDeleted} more with generic titles`);
  
  // Step 2: Get framework IDs
  const { data: fws } = await sb.from('script_frameworks').select('id, slug');
  const tensionId = fws.find(f => f.slug === 'tension')?.id;
  const claymationId = fws.find(f => f.slug === 'claymation')?.id;
  console.log('Tension framework:', tensionId);
  console.log('Claymation framework:', claymationId);
  
  // Step 3: Re-import from batch JSON files with PROPER mapping
  const fs = require('fs');
  const path = require('path');
  const glob = require('child_process').execSync(
    'cmd /c dir /b C:\\GWDS\\story-script-framework\\scripts\\clayverse\\batch_0*.json',
    { encoding: 'utf-8' }
  ).trim().split('\n').map(f => f.trim()).filter(Boolean);
  
  const baseDir = 'C:\\GWDS\\story-script-framework\\scripts\\clayverse\\';
  let imported = 0;
  
  for (const filename of glob) {
    const filepath = baseDir + filename;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      if (!Array.isArray(data) || !data[0] || typeof data[0] !== 'object') continue;
    } catch { continue; }
    
    // Only import scripts that have script_text
    const valid = data.filter(s => s.script_text && s.script_text.trim().length > 20);
    if (valid.length === 0) {
      console.log(`SKIP: ${filename} (0 valid scripts)`);
      continue;
    }
    
    const batchName = path.basename(filename, '.json');
    
    // Map to proper Supabase schema
    const records = valid.map(s => {
      const format = s.format || '';
      const isSkit = ['standalone_skit', 'skit_comedy', 'skit_horror', 'skit_action', 
                       'action_clip', 'heartfelt', 'parody', 'pov_clip', 'pov',
                       'horror_short', 'compilation', 'skit_whatif'].includes(format);
      
      return {
        title: s.title || `${s.series_title || 'Untitled'} — Episode ${s.episode || '?'}`,
        framework_id: isSkit ? claymationId : tensionId,
        category: s.genre || format || 'general',
        series_name: s.series_title || s.series_id || null,
        script_content: s.script_text,
        word_count: s.word_count || s.script_text.split(/\s+/).length,
        estimated_duration_secs: s.duration_seconds || 60,
        status: 'draft',
        // Store ALL rich data in metadata
        metadata: {
          original_id: s.id || null,
          batch: batchName,
          channel: s.channel || 'clayverse',
          format: format,
          episode: s.episode || null,
          total_episodes: s.total_episodes || null,
          dramatic_structure: s.dramatic_structure || null,
          narrator_voice: s.narrator_voice || null,
          characters: s.characters || [],
          setting: s.setting || null,
          sections: s.sections || null,
          visual_prompts: s.visual_prompts || [],
          music_prompt: s.music_prompt || null,
          next_episode_tease: s.next_episode_tease || null,
          tags: s.tags || [],
        },
        // Map to dedicated columns if they exist
        music_prompt: s.music_prompt || null,
        video_prompt: (s.visual_prompts && s.visual_prompts[0]) ? s.visual_prompts[0].prompt : null,
        visual_prompts: s.visual_prompts || null,
        tags: s.tags || null,
      };
    });
    
    // Insert in chunks
    for (let i = 0; i < records.length; i += 25) {
      const chunk = records.slice(i, i + 25);
      const { data: inserted, error } = await sb.from('scripts').insert(chunk).select('id');
      if (error) {
        console.log(`${batchName} [${i+1}-${i+chunk.length}]: ERROR - ${error.message}`);
        // Try without optional columns that might not exist
        const stripped = chunk.map(r => {
          const { music_prompt, video_prompt, visual_prompts, tags, ...rest } = r;
          return rest;
        });
        const { data: ins2, error: err2 } = await sb.from('scripts').insert(stripped).select('id');
        if (err2) {
          console.log(`  Retry also failed: ${err2.message}`);
        } else {
          imported += (ins2?.length || 0);
          console.log(`  Retry OK: ${ins2?.length || 0} imported (without optional cols)`);
        }
      } else {
        imported += (inserted?.length || 0);
        console.log(`${batchName} [${i+1}-${i+chunk.length}]: ${inserted?.length || 0} imported`);
      }
    }
  }
  
  console.log(`\nTotal properly imported: ${imported}`);
  
  // Final count
  const { count } = await sb.from('scripts').select('id', { count: 'exact', head: true });
  console.log(`Total scripts in DB: ${count}`);
}

run().catch(console.error);
