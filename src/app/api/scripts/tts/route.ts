import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { spawnSync } from 'child_process';

// Resolve FFmpeg binary: prefer system ffmpeg, fall back to ffmpeg-static
function getFfmpegPath(): string {
  try {
    // ffmpeg-static provides platform binary
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('ffmpeg-static') as string;
  } catch {
    return 'ffmpeg'; // assume in PATH
  }
}
const FFMPEG = getFfmpegPath();

/**
 * Change playback speed of an MP3 buffer using FFmpeg atempo filter.
 * atempo must be chained for values outside 0.5–2.0.
 */
function applySpeed(input: Buffer, rate: number): Buffer {
  if (rate === 1.0) return input;

  // Build atempo chain: each filter step handles at most 0.5–2.0x
  const filters: string[] = [];
  let remaining = rate;
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);

  const filterStr = filters.join(',');

  const result = spawnSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error',
    '-i', 'pipe:0',
    '-filter:a', filterStr,
    '-codec:a', 'libmp3lame',
    '-q:a', '2',
    '-f', 'mp3',
    'pipe:1',
  ], {
    input,
    maxBuffer: 50 * 1024 * 1024, // 50MB
    timeout: 30_000,
  });

  if (result.error) throw new Error(`FFmpeg error: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`FFmpeg exited ${result.status}: ${result.stderr?.toString()}`);
  return result.stdout as Buffer;
}

// ─── Inworld TTS Config ───────────────────────────────────────────────────────
const INWORLD_API_KEY = 'TzY4dGV1ZzVHWGFmSnBHMlh2cEZZbnN0VVMzcHpLYTc6ZDRqM3FJYlJBalZZTTY0ekw3MGpmVGdvNEszVU0xMFMwSG9aR1dkejdSVG9ITTZDdWRaYlpNbGdDcmVDdW1BSg==';
const INWORLD_BASE = 'https://api.inworld.ai/tts/v1';
const INWORLD_MAX_CHARS = 1800; // Stay under 2000 char API limit with safety margin
const DEFAULT_VOICE = 'Ashley';
const DEFAULT_MODEL = 'inworld-tts-1.5-max';

// ─── Voice cache (refresh every hour) ────────────────────────────────────────
let voiceCache: { voices: any[]; at: number } | null = null;

async function getInworldVoices() {
  if (voiceCache && Date.now() - voiceCache.at < 3_600_000) return voiceCache.voices;
  try {
    const res = await fetch(`${INWORLD_BASE}/voices`, {
      headers: { 'Authorization': `Basic ${INWORLD_API_KEY}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      const d = await res.json();
      const voices = (d.voices || []).map((v: any) => ({
        voice_id: v.voiceId,
        name: v.displayName,
        description: v.description || '',
        languages: v.languages || ['en'],
        category: (v.languages || ['en'])[0],
      }));
      voiceCache = { voices, at: Date.now() };
      return voices;
    }
  } catch {}
  // Fallback — core English voices if API is unreachable
  return FALLBACK_VOICES;
}

const FALLBACK_VOICES = [
  { voice_id: 'Loretta', name: 'Loretta', description: 'Inviting, folksy Southern female voice, perfect for cooking shows, heartwarming family tales, and cozy radio ads.', category: 'en' },
  { voice_id: 'Darlene', name: 'Darlene', description: 'Soothing, comforting Southern female voice, ideal for bedtime stories, family-centered commercials, and nostalgic narrations.', category: 'en' },
  { voice_id: 'Marlene', name: 'Marlene', description: 'Friendly, relaxed Southern female voice, ideal for home-style cooking tutorials, community event promotions, and downhome commercials.', category: 'en' },
  { voice_id: 'Hank', name: 'Hank', description: 'Warm, laid-back Southern male voice, ideal for travel documentaries, heritage storytelling, and down-to-earth podcast ads.', category: 'en' },
  { voice_id: 'Evelyn', name: 'Evelyn', description: 'A gentle and intimate female voice, ideal for personal ASMR content, affirmations, and close, calming conversations.', category: 'en' },
  { voice_id: 'Celeste', name: 'Celeste', description: 'Soft, whispery female voice, ideal for ASMR videos, soothing lullabies, and gentle mindfulness sessions.', category: 'en' },
  { voice_id: 'Pippa', name: 'Pippa', description: 'Friendly and casual Australian female voice, ideal for relaxed instructional content.', category: 'en' },
  { voice_id: 'Tessa', name: 'Tessa', description: 'Upbeat, conversational Australian female voice, perfect for lifestyle vlogs, playful advertisements, and engaging social media content.', category: 'en' },
  { voice_id: 'Liam', name: 'Liam', description: 'Upbeat, motivating Australian male voice, perfect for energizing workout sessions, lively event promotions, and informal lifestyle content.', category: 'en' },
  { voice_id: 'Callum', name: 'Callum', description: 'Casual and friendly Australian male voice, ideal for informal instructional content.', category: 'en' },
  { voice_id: 'Hamish', name: 'Hamish', description: 'Friendly and casual Australian male voice, ideal for character-driven roles and upbeat fitness.', category: 'en' },
  { voice_id: 'Abby', name: 'Abby', description: 'Bright, eager American female child voice, ideal for animated characters, upbeat educational content, and lively kids\' commercials.', category: 'en' },
  { voice_id: 'Graham', name: 'Graham', description: 'Profound, authoritative British male voice, perfect for historical documentaries, luxury brand advertisements, and educational content.', category: 'en' },
  { voice_id: 'Rupert', name: 'Rupert', description: 'Resonant, commanding British male voice, ideal for motivational speeches, epic film trailers, and dynamic corporate presentations.', category: 'en' },
  { voice_id: 'Mortimer', name: 'Mortimer', description: 'Gravelly, aggressive male character voice, ideal for fantasy villains and high-intensity game dialogue.', category: 'en' },
  { voice_id: 'Snik', name: 'Snik', description: 'Hoarse, cunning male voice, perfect for devious goblin roles, fantasy heist scenarios, and trickster-themed animations.', category: 'en' },
  { voice_id: 'Anjali', name: 'Anjali', description: 'A confident and articulate Indian female voice, ideal for professional training materials.', category: 'en' },
  { voice_id: 'Saanvi', name: 'Saanvi', description: 'Crisp, articulate Indian female voice, ideal for dynamic e-learning modules, articulate documentary narrations, and vibrant travel vlogs.', category: 'en' },
  { voice_id: 'Arjun', name: 'Arjun', description: 'Clear, composed Indian male voice, well-suited for instructional webinars and technology explainers.', category: 'en' },
  { voice_id: 'Claire', name: 'Claire', description: 'Warm, gentle Eastern European female voice, ideal for bedtime stories, relaxation podcasts.', category: 'en' },
  { voice_id: 'Oliver', name: 'Oliver', description: 'Neutral and clear male voice, ideal for public announcements and educational information.', category: 'en' },
  { voice_id: 'Simon', name: 'Simon', description: 'Articulate, insightful male voice, perfect for corporate presentations, technical tutorials, and steady news reporting.', category: 'en' },
  { voice_id: 'Elliot', name: 'Elliot', description: 'A calm, steady male voice, suitable for nature documentaries, general informational content, and relaxed narrations.', category: 'en' },
  { voice_id: 'James', name: 'James', description: 'Vibrant, expressive male voice, perfect for animated video content, lively event hosting, and captivating children\'s stories.', category: 'en' },
  { voice_id: 'Serena', name: 'Serena', description: 'Soft, nurturing female voice, perfect for mindfulness sessions, nature-inspired visualizations, and gentle wellness podcasts.', category: 'en' },
  { voice_id: 'Gareth', name: 'Gareth', description: 'Soothing, gentle male voice, ideal for guided meditations, mindfulness exercises, and relaxation-focused wellness content.', category: 'en' },
  { voice_id: 'Vinny', name: 'Vinny', description: 'Gritty, assertive New York male voice, perfect for crime dramas, urban documentaries, and no-nonsense character roles.', category: 'en' },
  { voice_id: 'Lauren', name: 'Lauren', description: 'Confident, friendly American female voice, ideal for corporate presentations, upbeat commercials, and engaging podcasts.', category: 'en' },
  { voice_id: 'Jessica', name: 'Jessica', description: 'Encouraging, articulate American female voice, perfect for self-help audiobooks, warm customer service messages, and clear e-learning modules.', category: 'en' },
  { voice_id: 'Ethan', name: 'Ethan', description: 'Assured, precise male voice, perfect for tech tutorials, detailed gadget overviews, and captivating product demonstrations.', category: 'en' },
  { voice_id: 'Tyler', name: 'Tyler', description: 'Authoritative, insightful male voice, ideal for tech explainer videos, in-depth software reviews, and dynamic coding guides.', category: 'en' },
  { voice_id: 'Jason', name: 'Jason', description: 'Lucid, engrossing male voice, ideal for tech tips, creative productivity hacks, and supportive user interface tutorials.', category: 'en' },
  { voice_id: 'Chloe', name: 'Chloe', description: 'Thoughtful, introspective youthful female voice, perfect for coming-of-age narratives, personal growth stories, and emotional teen dramas.', category: 'en' },
  { voice_id: 'Veronica', name: 'Veronica', description: 'Intimidating, commanding female voice, perfect for ruthless antagonists, high-stakes negotiations, and chilling monologues.', category: 'en' },
  { voice_id: 'Victoria', name: 'Victoria', description: 'Silky, cunning British female voice, ideal for narrating intricate plots.', category: 'en' },
  { voice_id: 'Miranda', name: 'Miranda', description: 'Menacing, cold-hearted female voice, perfect for strategic villains, mysterious narratives.', category: 'en' },
  { voice_id: 'Sebastian', name: 'Sebastian', description: 'Intimidating, steely male voice, perfect for ruthless antagonists, strategic power struggles, and chilling monologues.', category: 'en' },
  { voice_id: 'Victor', name: 'Victor', description: 'Ominous, sinister male voice, ideal for dark conspiracies, eerie suspense scenes, and enigmatic villain roles.', category: 'en' },
  { voice_id: 'Malcolm', name: 'Malcolm', description: 'Authoritative, manipulative male voice, perfect for cunning leaders, intense negotiation scenes, and persuasive villain speeches.', category: 'en' },
  { voice_id: 'Nate', name: 'Nate', description: 'Conversational, sociable male voice, great for customer support and friendly guidance.', category: 'en' },
  { voice_id: 'Brian', name: 'Brian', description: 'Friendly, encouraging American male voice, ideal for educational tutorials, motivational content, and instructional videos.', category: 'en' },
  { voice_id: 'Amina', name: 'Amina', description: 'Warm, inviting West African female voice, ideal for community outreach, cultural storytelling, and educational workshops.', category: 'en' },
  { voice_id: 'Kelsey', name: 'Kelsey', description: 'Warm, empathetic, reassuring female voice, ideal for phone support, appointment confirmations, and customer success calls.', category: 'en' },
  { voice_id: 'Derek', name: 'Derek', description: 'Steady, professional, composed American male voice, ideal for banking support, account inquiries, and service escalation calls.', category: 'en' },
  { voice_id: 'Evan', name: 'Evan', description: 'Friendly, approachable, easygoing male voice, ideal for onboarding calls, retail assistance, and customer check-ins.', category: 'en' },
  { voice_id: 'Kayla', name: 'Kayla', description: 'Enthusiastic, youthful female voice, ideal for reaction videos, trendy product reviews, and energetic lifestyle vlogs.', category: 'en' },
  { voice_id: 'Jake', name: 'Jake', description: 'Amiable, introspective male voice, ideal for motivational talks, personal growth content, and charming interviews.', category: 'en' },
  { voice_id: 'Grant', name: 'Grant', description: 'Calm, attentive, helpful male voice, ideal for insurance claims, troubleshooting walkthroughs, and helpdesk interactions.', category: 'en' },
  { voice_id: 'Alex', name: 'Alex', description: 'Energetic and expressive mid-range male voice, with a mildly nasal quality.', category: 'en' },
  { voice_id: 'Ashley', name: 'Ashley', description: 'A warm, natural female voice.', category: 'en' },
  { voice_id: 'Craig', name: 'Craig', description: 'Older British male with a refined and articulate voice.', category: 'en' },
  { voice_id: 'Deborah', name: 'Deborah', description: 'Warm, peaceful female voice with a calm tone.', category: 'en' },
  { voice_id: 'Dennis', name: 'Dennis', description: 'Middle-aged man with a smooth, calm and friendly voice.', category: 'en' },
  { voice_id: 'Edward', name: 'Edward', description: 'American male with an emphatic, confident and streetwise tone.', category: 'en' },
  { voice_id: 'Elizabeth', name: 'Elizabeth', description: 'Professional middle-aged woman, perfect for narrations and voiceovers.', category: 'en' },
  { voice_id: 'Hades', name: 'Hades', description: 'Commanding and gruff male voice, think an omniscient narrator or castle guard.', category: 'en' },
  { voice_id: 'Julia', name: 'Julia', description: 'Quirky, high-pitched female voice that delivers lines with playful energy.', category: 'en' },
  { voice_id: 'Pixie', name: 'Pixie', description: 'High-pitched, childlike female voice with a squeaky quality - great for a cartoon character.', category: 'en' },
  { voice_id: 'Mark', name: 'Mark', description: 'Energetic, expressive man with a rapid-fire delivery.', category: 'en' },
  { voice_id: 'Olivia', name: 'Olivia', description: 'Young, British female with a friendly and helpful tone, conveying confidence and efficiency.', category: 'en' },
  { voice_id: 'Priya', name: 'Priya', description: 'Even-toned female voice with an Indian accent.', category: 'en' },
  { voice_id: 'Ronald', name: 'Ronald', description: 'Confident, British man with a deep, gravelly voice.', category: 'en' },
  { voice_id: 'Sarah', name: 'Sarah', description: 'Fast-talking young adult woman, with a questioning and curious tone.', category: 'en' },
  { voice_id: 'Shaun', name: 'Shaun', description: 'Friendly, dynamic male voice great for conversations.', category: 'en' },
  { voice_id: 'Theodore', name: 'Theodore', description: 'Gravelly male voice, with a time-worn quality.', category: 'en' },
  { voice_id: 'Timothy', name: 'Timothy', description: 'Lively, upbeat American male voice.', category: 'en' },
  { voice_id: 'Wendy', name: 'Wendy', description: 'Posh, middle-aged British female voice.', category: 'en' },
  { voice_id: 'Dominus', name: 'Dominus', description: 'Robotic, deep male voice with a menacing quality. Perfect for villains.', category: 'en' },
  { voice_id: 'Hana', name: 'Hana', description: 'Bright, expressive young female voice, perfect for storytelling, gaming, and playful content.', category: 'en' },
  { voice_id: 'Clive', name: 'Clive', description: 'British-accented English-language male voice with a calm, cordial quality.', category: 'en' },
  { voice_id: 'Carter', name: 'Carter', description: 'Energetic, mature radio announcer-style male voice, great for storytelling, pep talks, and voiceovers.', category: 'en' },
  { voice_id: 'Blake', name: 'Blake', description: 'Rich, intimate male voice, perfect for audiobooks, romantic content, and reassuring narration.', category: 'en' },
  { voice_id: 'Luna', name: 'Luna', description: 'Calm, relaxing female voice, perfect for meditations, sleep stories, and mindfulness exercises.', category: 'en' },
  { voice_id: 'Yichen', name: 'Yichen', description: 'A calm, flat young adult male Chinese voice.', category: 'zh' },
  { voice_id: 'Xiaoyin', name: 'Xiaoyin', description: 'A youthful Chinese female voice with a gentle, sweet voice.', category: 'zh' },
  { voice_id: 'Xinyi', name: 'Xinyi', description: 'A Chinese woman with a neutral tone, perfect for narrations.', category: 'zh' },
  { voice_id: 'Jing', name: 'Jing', description: 'An energetic, fast-paced young Chinese female.', category: 'zh' },
  { voice_id: 'Erik', name: 'Erik', description: 'Older Dutch male voice with a weathered edge.', category: 'nl' },
  { voice_id: 'Katrien', name: 'Katrien', description: 'Dutch woman with an expressive voice.', category: 'nl' },
  { voice_id: 'Lennart', name: 'Lennart', description: 'A confident Dutch male voice. Calm and relaxed.', category: 'nl' },
  { voice_id: 'Lore', name: 'Lore', description: 'Clear, calm Dutch female voice, great for narrations and professional use cases.', category: 'nl' },
  { voice_id: 'Alain', name: 'Alain', description: 'Deep, smooth middle-aged male French voice. Composed and calm.', category: 'fr' },
  { voice_id: 'Helene', name: 'H\u00e9l\u00e8ne', description: 'Middle-aged French woman, with a smooth, musical, and graceful voice.', category: 'fr' },
  { voice_id: 'Mathieu', name: 'Mathieu', description: 'A French male voice carrying a nasal quality.', category: 'fr' },
  { voice_id: 'Etienne', name: '\u00c9tienne', description: 'Calm young adult French male.', category: 'fr' },
  { voice_id: 'Johanna', name: 'Johanna', description: 'A calm older German female with a low, smoky voice.', category: 'de' },
  { voice_id: 'Josef', name: 'Josef', description: 'An articulate German male voice with an announcer-like quality.', category: 'de' },
  { voice_id: 'Gianni', name: 'Gianni', description: 'Deep, smooth Italian male voice that speaks rapidly.', category: 'it' },
  { voice_id: 'Orietta', name: 'Orietta', description: 'Calm adult female Italian voice, with a soothing cadence.', category: 'it' },
  { voice_id: 'Asuka', name: 'Asuka', description: 'Friendly, young adult Japanese female voice.', category: 'ja' },
  { voice_id: 'Satoshi', name: 'Satoshi', description: 'Dramatic, expressive male Japanese voice filled with energy.', category: 'ja' },
  { voice_id: 'Hyunwoo', name: 'Hyunwoo', description: 'Young adult Korean male voice.', category: 'ko' },
  { voice_id: 'Minji', name: 'Minji', description: 'Energetic, friendly young Korean female voice.', category: 'ko' },
  { voice_id: 'Seojun', name: 'Seojun', description: 'Clear, deep mature Korean male voice.', category: 'ko' },
  { voice_id: 'Yoona', name: 'Yoona', description: 'Korean woman with a gentle, soothing voice.', category: 'ko' },
  { voice_id: 'Szymon', name: 'Szymon', description: 'Polish adult male voice with a warm, friendly quality.', category: 'pl' },
  { voice_id: 'Wojciech', name: 'Wojciech', description: 'A middle-aged Polish male voice.', category: 'pl' },
  { voice_id: 'Heitor', name: 'Heitor', description: 'Composed Portuguese-speaking male voice with a neutral tone.', category: 'pt' },
  { voice_id: 'Maite', name: 'Mait\u00ea', description: 'Middle-aged Portuguese-speaking female voice.', category: 'pt' },
  { voice_id: 'Diego', name: 'Diego', description: 'Spanish-speaking male voice with a soothing, gentle quality.', category: 'es' },
  { voice_id: 'Lupita', name: 'Lupita', description: 'Vibrant, energetic young Spanish-speaking female voice.', category: 'es' },
  { voice_id: 'Miguel', name: 'Miguel', description: 'A calm adult Spanish-speaking male voice, perfect for storytelling.', category: 'es' },
  { voice_id: 'Rafael', name: 'Rafael', description: 'Middle-aged Spanish-speaking male with a deep, composed voice. Great for narrations.', category: 'es' },
  { voice_id: 'Svetlana', name: 'Svetlana', description: 'Soft, high-pitched female voice, with a moderate pace and slightly breathy quality.', category: 'ru' },
  { voice_id: 'Elena', name: 'Elena', description: 'Clear, mid-range female voice, with a smooth texture and a neutral, informational tone.', category: 'ru' },
  { voice_id: 'Dmitry', name: 'Dmitry', description: 'Deep, gravelly male voice, delivered at a moderate pace with a commanding and narrative tone.', category: 'ru' },
  { voice_id: 'Nikolai', name: 'Nikolai', description: 'Deep, resonant male voice, delivered at a measured pace with a clear, theatrical, and narrative quality.', category: 'ru' },
  { voice_id: 'Riya', name: 'Riya', description: 'Professional and clean female voice, with a clear and articulate tone, moderate pace, and a polished, approachable quality.', category: 'hi' },
  { voice_id: 'Manoj', name: 'Manoj', description: 'Clear, professional Hindi male voice. Great for narrations, news anchors, and customer service.', category: 'hi' },
  { voice_id: 'Yael', name: 'Yael', description: 'Mid-range female Hebrew voice, suitable for narrations, storytelling, and more.', category: 'he' },
  { voice_id: 'Oren', name: 'Oren', description: 'Steady male Hebrew voice, great for podcasts, voice overs, or announcers.', category: 'he' },
  { voice_id: 'Nour', name: 'Nour', description: 'Polished female Arabic voice with a friendly tone, great for voice over or support.', category: 'ar' },
  { voice_id: 'Omar', name: 'Omar', description: 'Bright, confident Arabic male voice, great for announcements, broadcasts, and voice overs.', category: 'ar' },
];

// ─── Inworld audio markup tags (DON'T strip these from text) ─────────────────
const INWORLD_MARKUP_TAGS = new Set([
  'happy','sad','angry','surprised','fearful','disgusted',
  'laughing','whispering',
  'breathe','clear_throat','cough','laugh','sigh','yawn',
]);

// ─── Text cleaner — strip script formatting, keep Inworld markups ─────────────
function extractTtsText(script: any): string {
  let text = script.tts_content || script.script_content || '';

  // 1. Extract from === INWORLD TTS === section if present
  const inworldMatch = text.match(/===\s*(?:INWORLD TTS|VIBEVOICE|CLEAN TTS|TTS)[^=]*===\s*([\s\S]*?)(?:===|$)/i);
  if (inworldMatch) {
    text = inworldMatch[1].trim();
  }

  // 2. Strip speaker tags: "Speaker 1:", "Speaker:", "HOST:", "NARRATOR:", etc.
  text = text.replace(/^(?:Speaker\s*\d*|Host|Narrator|V\.?O\.?|Voiceover)\s*:\s*/gim, '');

  // 3. Strip section headers like [ATTENTION], [NEED], [SATISFACTION], [TEASE - 0:05]
  //    BUT keep Inworld markup tags like [happy], [breathe], etc.
  text = text.replace(/\[([^\]]+)\]/g, (match: string, tag: string) => {
    const clean = tag.toLowerCase().replace(/[^a-z_]/g, '').trim();
    // Keep Inworld markup tags, strip everything else
    if (INWORLD_MARKUP_TAGS.has(clean)) return match;
    return ''; // remove script section headers
  });

  // 4. Strip markdown formatting (but NOT asterisks — Inworld uses *word* for emphasis)
  text = text
    .replace(/^#{1,6}\s+/gm, '')              // # Headers
    .replace(/\*\*(.*?)\*\*/g, '*$1*')         // **bold** → *word* (Inworld emphasis)
    .replace(/^[-*]{3,}\s*$/gm, '')            // horizontal rules
    .replace(/={3,}[^=]*={3,}/g, '')           // === SECTION === dividers
    .replace(/^\s*[-*•]\s+/gm, '')             // bullet points

  // 5. Strip timestamps like "0:05 -", "(0:05)", "[0:05]"
  text = text.replace(/\(?\[?\d+:\d+\]?\)?\s*[-–]\s*/g, '');

  // 6. Clean up excess whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

// ─── Chunk text at sentence boundaries ────────────────────────────────────────
function chunkText(text: string, maxChars = INWORLD_MAX_CHARS): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) { chunks.push(remaining); break; }

    const slice = remaining.slice(0, maxChars);
    // Split at sentence end: period, !, ?, or newline
    const lastBreak = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('\n'),
    );

    const cutAt = lastBreak > 0 ? lastBreak + 1 : maxChars;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  return chunks.filter(c => c.length > 0);
}

// ─── Call Inworld TTS for one chunk → base64 MP3 ─────────────────────────────
async function inworldSynthesize(
  text: string,
  voiceId: string,
  modelId: string,
  temperature?: number,
): Promise<string> {
  const payload: Record<string, any> = { text, voiceId, modelId };
  // temperature: Inworld-documented param (0.6–1.5, default 1.1)
  if (temperature !== undefined) payload.temperature = Math.min(1.5, Math.max(0.6, temperature));

  const res = await fetch(`${INWORLD_BASE}/voice`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${INWORLD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Inworld TTS error ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (!data.audioContent) throw new Error('No audioContent in Inworld response');
  return data.audioContent;
}

// ─── Generate full audio, handling chunking ───────────────────────────────────
async function generateInworldAudio(
  text: string,
  voiceId = DEFAULT_VOICE,
  modelId = DEFAULT_MODEL,
  temperature?: number,
): Promise<Buffer> {
  const chunks = chunkText(text);

  if (chunks.length === 1) {
    return Buffer.from(
      await inworldSynthesize(chunks[0], voiceId, modelId, temperature),
      'base64'
    );
  }

  // Batch 3 at a time, in order
  const results: Buffer[] = [];
  for (let i = 0; i < chunks.length; i += 3) {
    const batch = chunks.slice(i, i + 3);
    const batchBuffers = await Promise.all(
      batch.map(chunk =>
        inworldSynthesize(chunk, voiceId, modelId, temperature)
          .then(b64 => Buffer.from(b64, 'base64'))
      )
    );
    results.push(...batchBuffers);
  }

  return Buffer.concat(results);
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');

  if (action === 'status') {
    return NextResponse.json({
      provider: 'inworld',
      available: true,
      models: ['inworld-tts-1.5-max', 'inworld-tts-1.5-mini'],
    });
  }

  // List all voices from Inworld API (live + cached)
  const voices = await getInworldVoices();
  return NextResponse.json({
    voices: voices.map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      description: v.description,
      category: v.category,
    })),
    provider: 'inworld',
    total: voices.length,
    localAvailable: false,
  });
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scriptId,
      voiceId = DEFAULT_VOICE,
      modelId = DEFAULT_MODEL,
      save = false,
      text: rawText,
      temperature,    // Inworld API param: controls expressiveness (0.6–1.5, default 1.1)
      speakingRate,   // Post-processed via FFmpeg atempo (0.5–2.0)
    } = body;

    let ttsText: string;

    if (rawText) {
      ttsText = rawText;
    } else {
      if (!scriptId) return NextResponse.json({ error: 'scriptId or text required' }, { status: 400 });

      const sb = getServiceSupabase();
      const { data: script, error } = await sb.from('scripts').select('*').eq('id', scriptId).single();
      if (error || !script) return NextResponse.json({ error: 'Script not found' }, { status: 404 });

      ttsText = extractTtsText(script);
      if (!ttsText) return NextResponse.json({ error: 'No text content available' }, { status: 400 });
    }

    // Generate audio from Inworld (temperature applied)
    let audioBuffer = await generateInworldAudio(ttsText, voiceId, modelId, temperature);

    // Apply speed via FFmpeg atempo post-processing
    const rate = typeof speakingRate === 'number' ? speakingRate : 1.0;
    if (rate !== 1.0) {
      try {
        audioBuffer = applySpeed(audioBuffer, Math.min(2.0, Math.max(0.5, rate)));
      } catch (e: any) {
        console.error('[TTS] FFmpeg speed error:', e.message, '— returning original speed');
      }
    }

    // Save to Supabase Storage
    if (save && scriptId) {
      const sb = getServiceSupabase();
      const fileName = `${scriptId}-${voiceId}-${Date.now()}.mp3`;

      const { error: uploadErr } = await sb.storage
        .from('script-audio')
        .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

      if (uploadErr) return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });

      const { data: urlData } = sb.storage.from('script-audio').getPublicUrl(fileName);
      const audioUrl = urlData.publicUrl;

      await sb.from('scripts').update({
        audio_url: audioUrl,
        status: 'produced',
        updated_at: new Date().toISOString(),
      }).eq('id', scriptId);

      return NextResponse.json({ audio_url: audioUrl, provider: 'inworld', voice: voiceId });
    }

    // Stream binary MP3
    return new NextResponse(
      audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer,
      {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${scriptId || 'script'}-${voiceId}.mp3"`,
          'Content-Length': String(audioBuffer.length),
        },
      }
    );
  } catch (e: any) {
    console.error('[TTS] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
