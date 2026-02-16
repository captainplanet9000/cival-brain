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

/** Get IndexTTS status (busy, queue, jobs) */
async function getIndexTTSStatus() {
  try {
    const res = await fetch(`${INDEXTTS_API}/status`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

/** Generate TTS via local IndexTTS-2 (async mode — returns job_id) */
async function generateWithIndexTTSAsync(text: string): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${INDEXTTS_API}/tts/async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`IndexTTS error: ${err}`);
  }
  return res.json();
}

/** Poll IndexTTS job until done or timeout */
async function waitForIndexTTSJob(jobId: string, timeoutMs = 600000): Promise<ArrayBuffer> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${INDEXTTS_API}/jobs/${jobId}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Job poll failed: ${res.status}`);
    const job = await res.json();
    if (job.status === 'done') {
      // Download the audio
      const audioRes = await fetch(`${INDEXTTS_API}/jobs/${jobId}/download`, { signal: AbortSignal.timeout(30000) });
      if (!audioRes.ok) throw new Error('Failed to download generated audio');
      return audioRes.arrayBuffer();
    }
    if (job.status === 'error') throw new Error(`TTS generation failed: ${job.error}`);
    if (job.status === 'cancelled') throw new Error('TTS job was cancelled');
    // Wait 3s between polls
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('TTS generation timed out');
}

/** Generate TTS via local IndexTTS-2 (sync fallback) */
async function generateWithIndexTTS(text: string): Promise<ArrayBuffer> {
  const res = await fetch(`${INDEXTTS_API}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(600000),
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

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');

  // GET /api/scripts/tts?action=status — check TTS engine status
  if (action === 'status') {
    const localAvailable = await isIndexTTSAvailable();
    const localStatus = localAvailable ? await getIndexTTSStatus() : null;
    return NextResponse.json({
      indextts: { available: localAvailable, ...(localStatus || {}) },
      elevenlabs: { available: !!process.env.ELEVENLABS_API_KEY },
    });
  }

  // GET /api/scripts/tts?action=cancel&jobId=xxx — cancel a job
  if (action === 'cancel') {
    const jobId = req.nextUrl.searchParams.get('jobId');
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    try {
      const res = await fetch(`${INDEXTTS_API}/jobs/${jobId}`, { method: 'DELETE', signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      return NextResponse.json(data);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // GET /api/scripts/tts?action=cancel-all — cancel all pending jobs
  if (action === 'cancel-all') {
    try {
      const res = await fetch(`${INDEXTTS_API}/jobs`, { method: 'DELETE', signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      return NextResponse.json(data);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Default: list voices
  try {
    const localAvailable = await isIndexTTSAvailable();
    const voices: any[] = [];

    if (localAvailable) {
      // Get voices from IndexTTS
      try {
        const vRes = await fetch(`${INDEXTTS_API}/voices`, { signal: AbortSignal.timeout(3000) });
        if (vRes.ok) {
          const vData = await vRes.json();
          for (const v of vData.voices || []) {
            voices.push({ voice_id: `indextts-${v.id}`, name: `IndexTTS: ${v.id} (Local GPU)`, category: 'local', preview_url: null });
          }
        }
      } catch {}
      if (voices.length === 0) {
        voices.push({ voice_id: 'indextts-local', name: 'IndexTTS Local (GPU)', category: 'local', preview_url: null });
      }
    }

    // Also fetch ElevenLabs voices
    try {
      const res = await fetch(`${ELEVENLABS_BASE}/voices`, { headers: { 'xi-api-key': getApiKey() } });
      if (res.ok) {
        const data = await res.json();
        const elVoices = (data.voices || []).map((v: any) => ({
          voice_id: v.voice_id, name: v.name, category: v.category, preview_url: v.preview_url,
        }));
        voices.push(...elVoices);
      }
    } catch {}

    return NextResponse.json({ voices, localAvailable });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scriptId, voiceId, save, provider, async: useAsync } = body;
    if (!scriptId) return NextResponse.json({ error: 'scriptId required' }, { status: 400 });

    const sb = getServiceSupabase();
    const { data: script, error } = await sb.from('scripts').select('*').eq('id', scriptId).single();
    if (error || !script) return NextResponse.json({ error: 'Script not found' }, { status: 404 });

    const text = script.tts_content || script.script_content;
    if (!text) return NextResponse.json({ error: 'No text content available' }, { status: 400 });

    // Determine which TTS provider to use
    const useLocal = provider === 'local' || voiceId === 'indextts-local' || voiceId?.startsWith('indextts-') ||
      (!provider && !voiceId && await isIndexTTSAvailable());

    let audioBuffer: ArrayBuffer;
    let contentType: string;
    let fileExt: string;

    if (useLocal) {
      // Use async mode with polling for better control
      if (useAsync !== false) {
        try {
          const { job_id, status } = await generateWithIndexTTSAsync(text);
          if (status === 'queued') {
            return NextResponse.json({ job_id, status: 'queued', message: 'GPU busy — job queued. Poll GET /api/scripts/tts?action=status for updates.' });
          }
          // Poll until done
          audioBuffer = await waitForIndexTTSJob(job_id);
        } catch (e: any) {
          // If async fails (429 etc), return informative error
          if (e.message.includes('GPU busy')) {
            return NextResponse.json({ error: 'GPU is busy with another generation. Try again later or check status.', status: 'busy' }, { status: 429 });
          }
          throw e;
        }
      } else {
        audioBuffer = await generateWithIndexTTS(text);
      }
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
