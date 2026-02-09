import pg from 'pg';
const c = new pg.Client({connectionString:'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres',ssl:{rejectUnauthorized:false}});
await c.connect();

const frameworks = [
  {
    name: 'ASMPro Script Framework',
    slug: 'asmpro',
    description: "Monroe's Motivated Sequence + Duarte's Sparkline for motivational/affirmation TikTok content.",
    channel: 'what_i_need_to_hear',
    framework_type: 'asmpro',
    structure: {
      sections: [
        { name: 'ATTENTION', duration: '20-30s', purpose: 'Breath cue + Hook + Promise' },
        { name: 'NEED', duration: '20-30s', purpose: 'Problem naming + Root cause + Cost of inaction' },
        { name: 'SATISFACTION', duration: '40-50s', purpose: '3-step plan + If-Then protocols + Examples' },
        { name: 'VISUALIZATION', duration: '15-20s', purpose: 'Sensory scene + Identity language + Emotional anchor' },
        { name: 'ACTION', duration: '10-15s', purpose: 'Immediate next step + Empowerment close' },
      ],
      rules: ['Present tense throughout', '7-14 words per line', 'Identity language', 'If-Then protocols', 'Concrete 3-step plans', 'No future tense'],
      archetypes: ['calm_mentor', 'executive_gravitas', 'gentle_compassion', 'focus_scientist', 'urgency_coach', 'high_performance'],
      categories: ['pre_interview', 'pre_test', 'performance', 'mental_clarity', 'self_belief'],
    },
    example_prompt: 'Generate a pre-interview confidence script using executive_gravitas archetype',
    config: { target_duration: '90-120s', word_count: '225-300', tts_engine: 'VibeVoice', music_bpm: 92 },
  },
  {
    name: 'Story Script Framework',
    slug: 'tension',
    description: 'TENSION structure for fiction TikTok. 5-part series, 60s episodes, 150-160 words each.',
    channel: 'clay_verse',
    framework_type: 'tension',
    structure: {
      sections: [
        { name: 'TEASE', duration: '0:00-0:05', purpose: 'Cold open hook' },
        { name: 'ESTABLISH', duration: '0:05-0:15', purpose: 'Context - who, where, stakes' },
        { name: 'NAVIGATE', duration: '0:15-0:40', purpose: 'Rising action' },
        { name: 'SHIFT', duration: '0:40-0:50', purpose: 'Turn/twist' },
        { name: 'IMPACT', duration: '0:50-0:55', purpose: 'Emotional beat' },
        { name: 'OPEN', duration: '0:55-0:60', purpose: 'Cliffhanger' },
      ],
      rules: ['150-160 words per episode', '5-part series arc', 'CAPITALIZE key words', 'Cliffhanger every episode'],
      genres: ['zombie', 'alien', 'heist', 'supernatural', 'mystery', 'survival', 'psychological'],
      narrator_styles: ['survivor', 'witness', 'noir', 'haunted', 'tactical', 'intimate'],
      series_structure: ['Setup', 'Escalation', 'Crisis', 'Push', 'Resolution'],
    },
    example_prompt: 'Generate a 5-part zombie survival series set in an abandoned hospital',
    config: { target_duration: '60s', word_count: '150-160', episodes_per_series: 5 },
  },
  {
    name: 'Claymation Variety Show',
    slug: 'claymation',
    description: 'Robot Chicken-style variety show with skits and character libraries.',
    channel: 'claymation',
    framework_type: 'variety_show',
    structure: {
      sections: [
        { name: 'COLD_OPEN', duration: '5-10s', purpose: 'Quick absurd hook' },
        { name: 'SETUP', duration: '10-15s', purpose: 'Establish premise' },
        { name: 'ESCALATION', duration: '15-20s', purpose: 'Comedy builds' },
        { name: 'PUNCHLINE', duration: '5-10s', purpose: 'Payoff' },
        { name: 'TAG', duration: '3-5s', purpose: 'Final stinger' },
      ],
      rules: ['Max 45 seconds per skit', 'Visual comedy first', 'Absurdist humor', 'Clay aesthetic descriptions'],
      skit_types: ['parody', 'original', 'mashup', 'commercial_spoof', 'musical_number'],
    },
    example_prompt: 'Generate a claymation skit parodying a cooking show',
    config: { target_duration: '30-45s', style: 'robot_chicken' },
  },
];

for (const fw of frameworks) {
  const { rows } = await c.query('SELECT id FROM script_frameworks WHERE slug = $1', [fw.slug]);
  if (rows.length > 0) {
    console.log(`Framework ${fw.slug} already exists`);
    continue;
  }
  await c.query(
    `INSERT INTO script_frameworks (name, slug, description, channel, framework_type, structure, example_prompt, config)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [fw.name, fw.slug, fw.description, fw.channel, fw.framework_type, JSON.stringify(fw.structure), fw.example_prompt, JSON.stringify(fw.config)]
  );
  console.log(`✅ Seeded framework: ${fw.slug}`);
}

// Now link scripts to frameworks
const { rows: fws } = await c.query('SELECT id, slug FROM script_frameworks');
const fwMap = {};
fws.forEach(f => { fwMap[f.slug] = f.id; });

// Update scripts that have null framework_id based on tags
const { rowCount: r1 } = await c.query(
  `UPDATE scripts SET framework_id = $1 WHERE framework_id IS NULL AND 'asmpro' = ANY(tags)`,
  [fwMap.asmpro]
);
console.log(`Linked ${r1} scripts to asmpro framework`);

const { rowCount: r2 } = await c.query(
  `UPDATE scripts SET framework_id = $1 WHERE framework_id IS NULL AND ('tension' = ANY(tags) OR 'story' = ANY(tags))`,
  [fwMap.tension]
);
console.log(`Linked ${r2} scripts to tension framework`);

// Final counts
const { rows: counts } = await c.query('SELECT count(*) FROM scripts');
console.log(`\nTotal scripts: ${counts[0].count}`);
const { rows: fwCounts } = await c.query('SELECT count(*) FROM script_frameworks');
console.log(`Total frameworks: ${fwCounts[0].count}`);

await c.end();
