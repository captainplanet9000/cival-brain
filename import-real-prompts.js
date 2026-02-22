const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://vusjcfushwxwksfuszjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ'
);

const styleMap = {
  forests: 'nature', grasslands: 'nature', garden: 'nature', botanicals: 'nature', wetland: 'nature',
  sky: 'nature', weather: 'nature', golden_hour: 'nature',
  ocean: 'nature', water: 'nature', rain_lakes: 'nature', underwater: 'nature', coastal: 'nature',
  desert: 'nature', mountains: 'nature', autumn: 'nature',
  night: 'cosmic', light: 'cosmic',
  macro: 'organic',
};

function titleCase(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function main() {
  const raw = JSON.parse(fs.readFileSync('C:\\GWDS\\video-prompts\\batch-all-500.json', 'utf8'));
  console.log(`Loaded ${raw.length} prompts`);

  // Delete all existing
  const { error: delErr } = await sb.from('background_prompts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) { console.error('Delete error:', delErr); return; }
  console.log('Deleted existing rows');

  // Insert in batches of 50
  const rows = raw.map(p => ({
    title: titleCase(p.subcategory),
    prompt: p.prompt,
    category: p.category,
    subcategory: p.subcategory,
    mood: p.mood || 'neutral',
    style: styleMap[p.category] || 'nature',
    motion_type: 'slow_drift',
    format: '9:16 vertical',
    loop_friendly: true,
    caption_safe: true,
    platform: 'higgsfield',
    status: 'draft',
    usage_count: 0,
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await sb.from('background_prompts').insert(batch);
    if (error) { console.error(`Batch ${i} error:`, error); return; }
    console.log(`Inserted ${i + batch.length}/${rows.length}`);
  }
  console.log('Done!');
}

main();
