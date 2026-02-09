import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const c = new pg.Client({connectionString:'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres',ssl:{rejectUnauthorized:false}});
await c.connect();

// Get framework IDs
const { rows: fws } = await c.query('SELECT id, slug FROM script_frameworks');
const fwMap = {};
fws.forEach(f => { fwMap[f.slug] = f.id; });

// Get existing titles
const { rows: existing } = await c.query('SELECT title FROM scripts');
const existingTitles = new Set(existing.map(r => r.title));

// Import remaining ASMPro scripts
const asmproDir = 'C:\\GWDS\\asmpro-script-writer\\scripts';
const asmproFiles = readdirSync(asmproDir).filter(f => f.endsWith('.txt'));
let imported = 0;

for (const file of asmproFiles) {
  const match = file.match(/^(\w+)_Script_(\d+)_(.+)\.txt$/);
  if (!match) continue;
  const category = match[1];
  const title = match[3].replace(/_/g, ' ');
  if (existingTitles.has(title)) continue;

  const content = readFileSync(join(asmproDir, file), 'utf8');
  const ttsMatch = content.match(/=== CLEAN TTS[^=]*===\s*([\s\S]*?)(?===|$)/i) || content.match(/=== VIBEVOICE[^=]*===\s*([\s\S]*?)(?===|$)/i);
  const sunoMatch = content.match(/=== SUNO[^=]*===\s*([\s\S]*?)(?===|$)/i);
  const higgsfieldMatch = content.match(/=== HIGGSFIELD[^=]*===\s*([\s\S]*?)(?===|$)/i);
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  await c.query(
    `INSERT INTO scripts (title, framework_id, category, status, script_content, tts_content, music_prompt, video_prompt, word_count, estimated_duration_secs, tags, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [title, fwMap.asmpro, category, 'approved', content,
     ttsMatch ? ttsMatch[1].trim() : null,
     sunoMatch ? sunoMatch[1].trim() : null,
     higgsfieldMatch ? higgsfieldMatch[1].trim() : null,
     wordCount, Math.round(wordCount / 2.5),
     ['asmpro', category],
     JSON.stringify({ source_file: file })]
  );
  imported++;
  existingTitles.add(title);
}
console.log(`Imported ${imported} additional ASMPro scripts`);

// Import remaining story series
const seriesDir = 'C:\\GWDS\\story-script-framework\\scripts\\series';
const seriesDirs = readdirSync(seriesDir).filter(d => d.startsWith('series_') && !d.includes('claymation'));
let storyImported = 0;

for (const dir of seriesDirs) {
  const seriesPath = join(seriesDir, dir);
  let episodes;
  try { episodes = readdirSync(seriesPath).filter(f => f.startsWith('episode_') && f.endsWith('.txt')); } catch { continue; }
  const seriesName = dir.replace(/^series_\d+_/, '').replace(/_/g, ' ');
  const seriesNameTitle = seriesName.charAt(0).toUpperCase() + seriesName.slice(1);

  for (const epFile of episodes) {
    const epNum = parseInt(epFile.match(/episode_(\d+)/)?.[1] || '1');
    const title = `${seriesNameTitle} - Episode ${epNum}`;
    if (existingTitles.has(title)) continue;

    const content = readFileSync(join(seriesPath, epFile), 'utf8');
    const visualMatch = content.match(/=== VISUAL[^=]*===\s*([\s\S]*?)(?===|$)/i);
    const musicMatch = content.match(/=== MUSIC[^=]*===\s*([\s\S]*?)(?===|$)/i);
    const genreMatch = content.match(/Genre:\s*(.+)/i);
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    await c.query(
      `INSERT INTO scripts (title, framework_id, category, series_name, episode_number, status, script_content, music_prompt, visual_prompts, word_count, estimated_duration_secs, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [title, fwMap.tension,
       genreMatch ? genreMatch[1].trim().toLowerCase().replace(/\s+/g, '_') : 'unknown',
       seriesNameTitle, epNum, 'approved', content,
       musicMatch ? musicMatch[1].trim() : null,
       JSON.stringify(visualMatch ? [visualMatch[1].trim()] : []),
       wordCount, 60,
       ['tension', 'story', seriesName],
       JSON.stringify({ source_dir: dir, source_file: epFile })]
    );
    storyImported++;
    existingTitles.add(title);
  }
}
console.log(`Imported ${storyImported} additional Story episodes`);

const { rows: counts } = await c.query('SELECT count(*) FROM scripts');
console.log(`Total scripts: ${counts[0].count}`);
await c.end();
