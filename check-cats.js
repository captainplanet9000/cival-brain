const d = require('C:/GWDS/video-prompts/batch-all-500.json');
const cats = {};
d.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
console.log('Existing categories in batch-all-500:');
Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
console.log('\nTotal:', d.length);

// WINTH ASMPro categories that need backgrounds
const winthCats = [
  'self_belief', 'performance', 'mental_clarity', 'pre_interview', 'pre_test',
  'rock_bottom_recovery', 'chronic_illness', 'caregiver_burnout', 'parenting_anxiety',
  'sobriety_identity', 'neurodivergent_identity', 'body_image', 'grief_loss',
  'financial_healing', 'career_reinvention', 'relationship_healing', 'loneliness',
  'ai_future_anxiety', 'universal', 'morning_power', 'evening_reflection',
  'stress_relief', 'confidence_boost', 'resilience', 'gratitude', 'focus',
  'creativity', 'courage', 'self_worth', 'healing', 'transformation', 'abundance'
];
console.log('\nWINTH categories that need mood-matched backgrounds:', winthCats.length);
