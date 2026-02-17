/**
 * Fix existing scripts: strip "Speaker 1:" tags and other non-TTS formatting
 * from tts_content in Supabase.
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vusjcfushwxwksfuszjv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Inworld markup tags that should be KEPT
const INWORLD_TAGS = new Set([
  'happy','sad','angry','surprised','fearful','disgusted',
  'laughing','whispering',
  'breathe','clear_throat','cough','laugh','sigh','yawn',
]);

function cleanTtsText(text) {
  if (!text) return text;

  // 1. Extract from === INWORLD TTS === section if present
  const inworldMatch = text.match(/===\s*(?:INWORLD TTS|VIBEVOICE|CLEAN TTS|TTS)[^=]*===\s*([\s\S]*?)(?:===|$)/i);
  if (inworldMatch) text = inworldMatch[1].trim();

  // 2. Strip speaker tags: "Speaker 1:", "Speaker:", "HOST:", "NARRATOR:", etc.
  text = text.replace(/^(?:Speaker\s*\d*|Host|Narrator|V\.?O\.?|Voiceover)\s*:\s*/gim, '');

  // 3. Strip script section headers [ATTENTION] etc. but keep Inworld markups
  text = text.replace(/\[([^\]]+)\]/g, (match, tag) => {
    const clean = tag.toLowerCase().replace(/[^a-z_]/g, '').trim();
    return INWORLD_TAGS.has(clean) ? match : '';
  });

  // 4. Strip markdown (convert **bold** to *word* for Inworld emphasis)
  text = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '*$1*')
    .replace(/^[-*]{3,}\s*$/gm, '')
    .replace(/={3,}[^=]*={3,}/g, '')
    .replace(/^\s*[-*•]\s+/gm, '');

  // 5. Strip timestamps like "0:05 -"
  text = text.replace(/\(?\[?\d+:\d+\]?\)?\s*[-–]\s*/g, '');

  // 6. Clean whitespace
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

async function main() {
  console.log('Fetching all scripts with tts_content...');
  const { data: scripts, error } = await supabase
    .from('scripts')
    .select('id, title, tts_content')
    .not('tts_content', 'is', null);

  if (error) { console.error('Error fetching scripts:', error); process.exit(1); }
  console.log(`Found ${scripts.length} scripts with tts_content`);

  let fixed = 0;
  for (const script of scripts) {
    const cleaned = cleanTtsText(script.tts_content);
    if (cleaned !== script.tts_content) {
      const { error: updateErr } = await supabase
        .from('scripts')
        .update({ tts_content: cleaned, updated_at: new Date().toISOString() })
        .eq('id', script.id);

      if (updateErr) {
        console.error(`Failed to update script ${script.id}:`, updateErr.message);
      } else {
        console.log(`✅ Fixed: "${script.title?.slice(0, 50)}"`);
        fixed++;
      }
    } else {
      console.log(`⏭  Skip (already clean): "${script.title?.slice(0, 50)}"`);
    }
  }

  console.log(`\nDone! Fixed ${fixed}/${scripts.length} scripts.`);
}

main().catch(console.error);
