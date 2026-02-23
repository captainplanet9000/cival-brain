const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://vusjcfushwxwksfuszjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ'
);

async function main() {
  const { count } = await s.from('background_prompts').select('id', { count: 'exact', head: true });
  console.log('Total prompts in Supabase:', count);

  const { data: cats } = await s.from('background_prompts').select('category');
  const catCounts = {};
  cats.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
  console.log('\nCategories:', Object.keys(catCounts).length);
  Object.entries(catCounts).sort((a,b) => b[1]-a[1]).slice(0, 10).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
  console.log('  ...');

  const { data: styles } = await s.from('background_prompts').select('style');
  const styleCounts = {};
  styles.forEach(r => { styleCounts[r.style] = (styleCounts[r.style] || 0) + 1; });
  console.log('\nStyles:');
  Object.entries(styleCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

  const { data: moods } = await s.from('background_prompts').select('mood');
  const moodCounts = {};
  moods.forEach(r => { moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1; });
  console.log('\nMoods:');
  Object.entries(moodCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
}
main();
