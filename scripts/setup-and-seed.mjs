// Run: node scripts/setup-and-seed.mjs
// Creates tables, seeds frameworks, imports existing scripts

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const SUPABASE_URL = 'https://vusjcfushwxwksfuszjv.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Use Supabase's SQL function via RPC
async function runSQL(sql) {
  // We'll use the management API for DDL
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  return res;
}

async function main() {
  console.log('=== Setting up Scripts System ===\n');

  // Step 1: Create tables via direct postgres connection
  // Since we can't run DDL via REST, we'll use the Supabase SQL Editor API
  const DB_URL = 'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres';
  
  // Try using pg if available, otherwise use fetch to supabase management API
  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.log('pg not available, will try creating tables via API...');
  }

  if (pg) {
    const client = new pg.default.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('Connected to database');

    const sql = readFileSync(join(import.meta.dirname || '.', 'setup-scripts-db.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ Tables created');
    await client.end();
  } else {
    console.log('⚠️  Cannot create tables without pg module. Please run the SQL manually or install pg.');
    console.log('   Continuing with seeding (tables may already exist)...\n');
  }

  // Step 2: Seed frameworks
  console.log('Seeding frameworks...');
  const { data: existing } = await sb.from('script_frameworks').select('id, slug');
  
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

  const existingSlugs = (existing || []).map(e => e.slug);
  const toInsert = frameworks.filter(f => !existingSlugs.includes(f.slug));
  
  if (toInsert.length > 0) {
    const { error } = await sb.from('script_frameworks').insert(toInsert);
    if (error) console.log('Framework seed error:', error.message);
    else console.log(`✅ Seeded ${toInsert.length} frameworks`);
  } else {
    console.log('✅ Frameworks already exist');
  }

  // Get framework IDs
  const { data: fws } = await sb.from('script_frameworks').select('id, slug');
  const fwMap = {};
  (fws || []).forEach(f => { fwMap[f.slug] = f.id; });

  // Step 3: Import ASMPro scripts
  console.log('\nImporting ASMPro scripts...');
  const asmproDir = 'C:\\GWDS\\asmpro-script-writer\\scripts';
  const asmproFiles = readdirSync(asmproDir).filter(f => f.endsWith('.txt'));
  
  // Check existing
  const { data: existingScripts } = await sb.from('scripts').select('title').eq('framework_id', fwMap.asmpro);
  const existingTitles = new Set((existingScripts || []).map(s => s.title));

  let importedAsmpro = 0;
  for (const file of asmproFiles) {
    const content = readFileSync(join(asmproDir, file), 'utf8');
    
    // Parse filename: category_Script_NNN_Title.txt
    const match = file.match(/^(\w+)_Script_(\d+)_(.+)\.txt$/);
    if (!match) continue;

    const category = match[1];
    const title = match[3].replace(/_/g, ' ');
    
    if (existingTitles.has(title)) continue;

    // Extract sections
    const ttsMatch = content.match(/=== CLEAN TTS[^=]*===\s*([\s\S]*?)(?===|$)/i) 
                  || content.match(/=== VIBEVOICE[^=]*===\s*([\s\S]*?)(?===|$)/i);
    const sunoMatch = content.match(/=== SUNO[^=]*===\s*([\s\S]*?)(?===|$)/i);
    const higgsfieldMatch = content.match(/=== HIGGSFIELD[^=]*===\s*([\s\S]*?)(?===|$)/i);

    const wordCount = content.split(/\s+/).filter(Boolean).length;

    const { error } = await sb.from('scripts').insert({
      title,
      framework_id: fwMap.asmpro,
      category,
      status: 'approved',
      script_content: content,
      tts_content: ttsMatch ? ttsMatch[1].trim() : null,
      music_prompt: sunoMatch ? sunoMatch[1].trim() : null,
      video_prompt: higgsfieldMatch ? higgsfieldMatch[1].trim() : null,
      word_count: wordCount,
      estimated_duration_secs: Math.round(wordCount / 2.5),
      tags: ['asmpro', category],
      metadata: { source_file: file },
    });

    if (!error) importedAsmpro++;
  }
  console.log(`✅ Imported ${importedAsmpro} ASMPro scripts`);

  // Step 4: Import Story scripts (first 5 complete series)
  console.log('\nImporting Story scripts...');
  const seriesDir = 'C:\\GWDS\\story-script-framework\\scripts\\series';
  const seriesDirs = readdirSync(seriesDir).filter(d => d.startsWith('series_') && !d.includes('claymation'));
  
  let importedStory = 0;
  for (const dir of seriesDirs.slice(0, 10)) {
    const seriesPath = join(seriesDir, dir);
    const episodes = readdirSync(seriesPath).filter(f => f.startsWith('episode_') && f.endsWith('.txt'));
    
    // Parse series name from dir
    const seriesName = dir.replace(/^series_\d+_/, '').replace(/_/g, ' ');
    const seriesNameTitle = seriesName.charAt(0).toUpperCase() + seriesName.slice(1);

    for (const epFile of episodes) {
      const content = readFileSync(join(seriesPath, epFile), 'utf8');
      const epNum = parseInt(epFile.match(/episode_(\d+)/)?.[1] || '1');
      const title = `${seriesNameTitle} - Episode ${epNum}`;

      if (existingTitles.has(title)) continue;

      // Extract visual prompts and music prompt
      const visualMatch = content.match(/=== VISUAL[^=]*===\s*([\s\S]*?)(?===|$)/i);
      const musicMatch = content.match(/=== MUSIC[^=]*===\s*([\s\S]*?)(?===|$)/i);
      const genreMatch = content.match(/Genre:\s*(.+)/i);

      const wordCount = content.split(/\s+/).filter(Boolean).length;

      const { error } = await sb.from('scripts').insert({
        title,
        framework_id: fwMap.tension,
        category: genreMatch ? genreMatch[1].trim().toLowerCase().replace(/\s+/g, '_') : 'unknown',
        series_name: seriesNameTitle,
        episode_number: epNum,
        status: 'approved',
        script_content: content,
        music_prompt: musicMatch ? musicMatch[1].trim() : null,
        visual_prompts: visualMatch ? [visualMatch[1].trim()] : [],
        word_count: wordCount,
        estimated_duration_secs: 60,
        tags: ['tension', 'story', seriesName],
        metadata: { source_dir: dir, source_file: epFile },
      });

      if (!error) importedStory++;
    }
  }
  console.log(`✅ Imported ${importedStory} Story episodes`);

  console.log('\n=== Setup Complete ===');
}

main().catch(console.error);
