import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// ─── Inworld TTS Config ───────────────────────────────────────────────────────
const INWORLD_API_KEY = 'TzY4dGV1ZzVHWGFmSnBHMlh2cEZZbnN0VVMzcHpLYTc6ZDRqM3FJYlJBalZZTTY0ekw3MGpmVGdvNEszVU0xMFMwSG9aR1dkejdSVG9ITTZDdWRaYlpNbGdDcmVDdW1BSg==';
const INWORLD_BASE = 'https://api.inworld.ai/tts/v1';
const INWORLD_MAX_CHARS = 2000; // API limit per request

// Available Inworld voices (from Inworld platform)
const INWORLD_VOICES = [
  { voice_id: 'Ashley',    name: 'Ashley',    gender: 'female', style: 'warm, conversational' },
  { voice_id: 'Matthew',   name: 'Matthew',   gender: 'male',   style: 'authoritative, clear' },
  { voice_id: 'Emma',      name: 'Emma',      gender: 'female', style: 'professional, bright' },
  { voice_id: 'James',     name: 'James',     gender: 'male',   style: 'friendly, approachable' },
  { voice_id: 'Olivia',    name: 'Olivia',    gender: 'female', style: 'expressive, dynamic' },
  { voice_id: 'Noah',      name: 'Noah',      gender: 'male',   style: 'calm, measured' },
  { voice_id: 'Ava',       name: 'Ava',       gender: 'female', style: 'energetic, upbeat' },
  { voice_id: 'Liam',      name: 'Liam',      gender: 'male',   style: 'dynamic, passionate' },
  { voice_id: 'Isabella',  name: 'Isabella',  gender: 'female', style: 'soothing, intimate' },
  { voice_id: 'William',   name: 'William',   gender: 'male',   style: 'deep, storytelling' },
  { voice_id: 'Sophia',    name: 'Sophia',    gender: 'female', style: 'confident, inspiring' },
  { voice_id: 'Alexander', name: 'Alexander', gender: 'male',   style: 'commanding, rich' },
];

const DEFAULT_VOICE = 'Ashley';
const DEFAULT_MODEL = 'inworld-tts-1.5-max';

// ─── Inworld TTS Generation ───────────────────────────────────────────────────

/** Split text at sentence boundaries to stay under 2000 char limit */
function chunkText(text: string, maxChars = INWORLD_MAX_CHARS): string[] {
  if (text.length <= maxChars) return [text];
  
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }
    
    // Find last sentence boundary within limit
    const slice = remaining.slice(0, maxChars);
    const lastSentence = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('\n'),
    );
    
    const cutAt = lastSentence > 0 ? lastSentence + 1 : maxChars;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }
  
  return chunks.filter(c => c.length > 0);
}

/** Call Inworld TTS API for a single chunk — returns base64 mp3 */
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
  return data.audioContent; // base64 MP3
}

/** Generate full audio — handles chunking for long scripts */
async function generateInworldAudio(
  text: string,
  voiceId: string = DEFAULT_VOICE,
  modelId: string = DEFAULT_MODEL
): Promise<Buffer> {
  const chunks = chunkText(text);
  
  if (chunks.length === 1) {
    const b64 = await inworldSynthesize(chunks[0], voiceId, modelId);
    return Buffer.from(b64, 'base64');
  }

  // Multiple chunks — generate in parallel (up to 3 at a time) then concatenate MP3 buffers
  const results: Buffer[] = [];
  for (let i = 0; i < chunks.length; i += 3) {
    const batch = chunks.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(chunk => inworldSynthesize(chunk, voiceId, modelId).then(b64 => Buffer.from(b64, 'base64')))
    );
    results.push(...batchResults);
  }
  
  return Buffer.concat(results);
}

// ─── Script TTS Content Optimizer ─────────────────────────────────────────────

/** 
 * Extract and clean TTS content from a script.
 * Preserves existing Inworld audio markup tags like [happy], [sigh], etc.
 */
function extractTtsText(script: any): string {
  // Prefer tts_content field (already extracted during generation)
  let text = script.tts_content || script.script_content || '';
  
  // Strip markdown headers and section dividers
  text = text
    .replace(/={3,}[^=]*={3,}/g, '')      // === SECTION === dividers
    .replace(/^#{1,6}\s+/gm, '')           // # Headers
    .replace(/\*\*(.*?)\*\*/g, '$1')       // **bold**
    .replace(/\*(.*?)\*/g, '$1')           // *italic*
    .replace(/\n{3,}/g, '\n\n')            // excess blank lines
    .trim();
    
  return text;
}

// ─── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');

  // GET /api/scripts/tts?action=status
  if (action === 'status') {
    return NextResponse.json({
      provider: 'inworld',
      available: true,
      models: ['inworld-tts-1.5-max', 'inworld-tts-1.5-mini'],
      voices: INWORLD_VOICES.length,
    });
  }

  // Default: list voices
  return NextResponse.json({
    voices: INWORLD_VOICES.map(v => ({
      voice_id: v.voice_id,
      name: `${v.name} — ${v.style}`,
      category: v.gender,
      preview_url: null,
    })),
    provider: 'inworld',
    localAvailable: false,
  });
}

// ─── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scriptId,
      voiceId = DEFAULT_VOICE,
      modelId = DEFAULT_MODEL,
      save = false,
      text: rawText,       // optional override — send text directly without script lookup
    } = body;

    let ttsText: string;

    if (rawText) {
      // Direct text mode (for preview/test)
      ttsText = rawText;
    } else {
      if (!scriptId) return NextResponse.json({ error: 'scriptId or text required' }, { status: 400 });
      
      const sb = getServiceSupabase();
      const { data: script, error } = await sb.from('scripts').select('*').eq('id', scriptId).single();
      if (error || !script) return NextResponse.json({ error: 'Script not found' }, { status: 404 });
      
      ttsText = extractTtsText(script);
      if (!ttsText) return NextResponse.json({ error: 'No text content available' }, { status: 400 });
    }

    // Generate audio via Inworld
    const audioBuffer = await generateInworldAudio(ttsText, voiceId, modelId);

    // Save to Supabase Storage and update script record
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

    // Stream audio back as MP3 download — NextResponse needs ArrayBuffer/Uint8Array
    return new NextResponse(audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${scriptId || 'script'}-${voiceId}.mp3"`,
        'Content-Length': String(audioBuffer.length),
      },
    });

  } catch (e: any) {
    console.error('[TTS] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
