import { NextRequest, NextResponse } from 'next/server';
import { writeFile, stat } from 'fs/promises';
import path from 'path';

const AUDIO_DIR = 'C:\\GWDS\\video-studio\\audio-assets';
const ELEVENLABS_API_KEY = 'sk_b5d754f3480e691c12971d8609e4165ffb7fe6463df74c4e';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, filename, duration } = body;

    if (!prompt || !filename) {
      return NextResponse.json({ error: 'prompt and filename required' }, { status: 400 });
    }

    const durationSeconds = Math.max(0.5, Math.min(30, duration || 10));

    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: durationSeconds
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: 'ElevenLabs API error', 
        details: errorText 
      }, { status: response.status });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const outputPath = path.join(AUDIO_DIR, filename);
    
    await writeFile(outputPath, audioBuffer);
    const fileStats = await stat(outputPath);

    return NextResponse.json({
      success: true,
      filename,
      size: fileStats.size
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
