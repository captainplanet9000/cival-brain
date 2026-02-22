const d = require('C:/GWDS/video-prompts/batch-all-500.json');
console.log('Total:', d.length);
const cats = {};
const moods = {};
const subcats = {};
d.forEach(p => {
  cats[p.category] = (cats[p.category] || 0) + 1;
  moods[p.mood] = (moods[p.mood] || 0) + 1;
  if (p.subcategory) subcats[p.subcategory] = (subcats[p.subcategory] || 0) + 1;
});
console.log('\nCategories:', Object.keys(cats).length);
Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(' ', k, ':', v));
console.log('\nMoods:', Object.keys(moods).length);
Object.entries(moods).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(' ', k, ':', v));
console.log('\nSubcategories:', Object.keys(subcats).length);
console.log('\nSample keys:', Object.keys(d[0]));
console.log('\nSample prompt length:', d[0].prompt.length, 'chars');
