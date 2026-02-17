import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

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
  { voice_id: 'Ashley',    name: 'Ashley',    description: 'A warm, natural female voice', category: 'en' },
  { voice_id: 'Alex',      name: 'Alex',      description: 'Energetic and expressive mid-range male voice', category: 'en' },
  { voice_id: 'Blake',     name: 'Blake',     description: 'Rich, intimate male voice, perfect for audiobooks', category: 'en' },
  { voice_id: 'Carter',    name: 'Carter',    description: 'Energetic, mature radio announcer-style male voice', category: 'en' },
  { voice_id: 'Celeste',   name: 'Celeste',   description: 'Soft, whispery female voice, ideal for ASMR', category: 'en' },
  { voice_id: 'Craig',     name: 'Craig',     description: 'Older British male with a refined and articulate voice', category: 'en' },
  { voice_id: 'Deborah',   name: 'Deborah',   description: 'Gentle and elegant female voice', category: 'en' },
  { voice_id: 'Dennis',    name: 'Dennis',    description: 'Middle-aged man with a smooth, calm and friendly voice', category: 'en' },
  { voice_id: 'Elizabeth', name: 'Elizabeth', description: 'Professional middle-aged woman, perfect for narrations', category: 'en' },
  { voice_id: 'Evelyn',    name: 'Evelyn',    description: 'Gentle, serene female voice, perfect for meditation', category: 'en' },
  { voice_id: 'Hades',     name: 'Hades',     description: 'Commanding and gruff male voice — omniscient narrator', category: 'en' },
  { voice_id: 'Hana',      name: 'Hana',      description: 'Bright, expressive young female, storytelling', category: 'en' },
  { voice_id: 'James',     name: 'James',     description: 'Vibrant, expressive male, animated video content', category: 'en' },
  { voice_id: 'Jessica',   name: 'Jessica',   description: 'Encouraging, articulate American female', category: 'en' },
  { voice_id: 'Julia',     name: 'Julia',     description: 'Quirky, high-pitched female with playful energy', category: 'en' },
  { voice_id: 'Lauren',    name: 'Lauren',    description: 'Confident, friendly American female', category: 'en' },
  { voice_id: 'Liam',      name: 'Liam',      description: 'Upbeat, motivating Australian male', category: 'en' },
  { voice_id: 'Loretta',   name: 'Loretta',   description: 'Inviting, folksy Southern female', category: 'en' },
  { voice_id: 'Luna',      name: 'Luna',      description: 'Calm, relaxing female, meditations and sleep stories', category: 'en' },
  { voice_id: 'Mark',      name: 'Mark',      description: 'Energetic, expressive man with rapid-fire delivery', category: 'en' },
  { voice_id: 'Olivia',    name: 'Olivia',    description: 'Young, British female with upbeat, friendly tone', category: 'en' },
  { voice_id: 'Oliver',    name: 'Oliver',    description: 'Soothing, precise male, meditation guides', category: 'en' },
  { voice_id: 'Ronald',    name: 'Ronald',    description: 'Confident, British man with a deep, gravelly voice', category: 'en' },
  { voice_id: 'Rupert',    name: 'Rupert',    description: 'Resonant, commanding British male, motivational', category: 'en' },
  { voice_id: 'Sarah',     name: 'Sarah',     description: 'Fast-talking young adult woman, questioning and curious', category: 'en' },
  { voice_id: 'Serena',    name: 'Serena',    description: 'Soft, nurturing female, mindfulness sessions', category: 'en' },
  { voice_id: 'Shaun',     name: 'Shaun',     description: 'Friendly, dynamic male great for conversations', category: 'en' },
  { voice_id: 'Theodore',  name: 'Theodore',  description: 'Gravelly male voice with a time-worn quality', category: 'en' },
  { voice_id: 'Timothy',   name: 'Timothy',   description: 'Lively, upbeat American male voice', category: 'en' },
  { voice_id: 'Wendy',     name: 'Wendy',     description: 'Posh, middle-aged British female', category: 'en' },
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
async function inworldSynthesize(text: string, voiceId: string, modelId: string): Promise<string> {
  const res = await fetch(`${INWORLD_BASE}/voice`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${INWORLD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voiceId, modelId }),
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
  modelId = DEFAULT_MODEL
): Promise<Buffer> {
  const chunks = chunkText(text);

  if (chunks.length === 1) {
    return Buffer.from(await inworldSynthesize(chunks[0], voiceId, modelId), 'base64');
  }

  // Batch 3 at a time, in order
  const results: Buffer[] = [];
  for (let i = 0; i < chunks.length; i += 3) {
    const batch = chunks.slice(i, i + 3);
    const batchBuffers = await Promise.all(
      batch.map(chunk =>
        inworldSynthesize(chunk, voiceId, modelId).then(b64 => Buffer.from(b64, 'base64'))
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

    // Generate audio
    const audioBuffer = await generateInworldAudio(ttsText, voiceId, modelId);

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
