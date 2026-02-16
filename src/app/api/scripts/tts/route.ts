import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const INDEXTTS_API = 'http://127.0.0.1:7861';

function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY not set');
  return key;
}

/** Check if local IndexTTS server is available */
async function isIndexTTSAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${INDEXTTS_API}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Generate TTS via local IndexTTS-2 */
async function generateWithIndexTTS(text: string): Promise<ArrayBuffer> {
  const res = await fetch(`${INDEXTTS_API}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(300000), // 5 min timeout for long texts
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`IndexTTS error: ${err}`);
  }
  return res.arrayBuffer();
}

/** Generate TTS via ElevenLabs */
async function generateWithElevenLabs(text: string, voiceId: string): Promise<ArrayBuffer> {
  const ttsRes = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': getApiKey(),
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    throw new Error(`ElevenLabs error: ${errText}`);
  }
  return ttsRes.arrayBuffer();
}

export async function GET() {
  try {
    // Check if local TTS is available
    const localAvailable = await isIndexTTSAvailable();

    // Always include local voice option
    const voices: any[] = [];
    if (localAvailable) {
      voices.push({
        voice_id: 'indextts-local',
        name: 'IndexTTS Local (GPU)',
        category: 'local',
        preview_url: null,
      });
    }

    // Also fetch ElevenLabs voices
    try {
      const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
        headers: { 'xi-api-key': getApiKey() },
      });
      if (res.ok) {
        const data = await res.json();
        const elVoices = (data.voices || []).map((v: any) => ({
          voice_id: v.voice_id,
          name: v.name,
          category: v.category,
          preview_url: v.preview_url,
        }));
        voices.push(...elVoices);
      }
    } catch {
      // ElevenLabs unavailable, that's ok
    }

    return NextResponse.json({ voices, localAvailable });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scriptId, voiceId, save, provider } = body;
    if (!scriptId) return NextResponse.json({ error: 'scriptId required' }, { status: 400 });

    const sb = getServiceSupabase();
    const { data: script, error } = await sb.from('scripts').select('*').eq('id', scriptId).single();
    if (error || !script) return NextResponse.json({ error: 'Script not found' }, { status: 404 });

    const text = script.tts_content || script.script_content;
    if (!text) return NextResponse.json({ error: 'No text content available' }, { status: 400 });

    let audioBuffer: ArrayBuffer;
    let contentType: string;
    let fileExt: string;

    // Determine which TTS provider to use
    const useLocal = provider === 'local' || voiceId === 'indextts-local' ||
      (!provider && !voiceId && await isIndexTTSAvailable());

    if (useLocal) {
      audioBuffer = await generateWithIndexTTS(text);
      contentType = 'audio/wav';
      fileExt = 'wav';
    } else {
      const vid = voiceId || DEFAULT_VOICE_ID;
      audioBuffer = await generateWithElevenLabs(text, vid);
      contentType = 'audio/mpeg';
      fileExt = 'mp3';
    }

    // If save=true, upload to Supabase Storage and update script record
    if (save) {
      const fileName = `${scriptId}-${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await sb.storage
        .from('script-audio')
        .upload(fileName, Buffer.from(audioBuffer), { contentType, upsert: true });

      if (uploadErr) return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });

      const { data: urlData } = sb.storage.from('script-audio').getPublicUrl(fileName);
      const audioUrl = urlData.publicUrl;

      await sb.from('scripts').update({ audio_url: audioUrl, updated_at: new Date().toISOString() }).eq('id', scriptId);

      return NextResponse.json({ audio_url: audioUrl, provider: useLocal ? 'indextts' : 'elevenlabs' });
    }

    // Stream back audio
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${scriptId}.${fileExt}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
