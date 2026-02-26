import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';

const AUDIO_DIR = 'C:\\GWDS\\video-studio\\audio-assets';

export async function GET(req: NextRequest) {
  try {
    const files = await readdir(AUDIO_DIR);
    const mp3Files = files.filter(f => f.endsWith('.mp3'));

    const audioFiles = await Promise.all(
      mp3Files.map(async (filename) => {
        const filePath = path.join(AUDIO_DIR, filename);
        const stats = await stat(filePath);
        
        let type = 'other';
        if (filename.startsWith('music-')) type = 'music';
        else if (filename.startsWith('sfx-')) type = 'sfx';

        return {
          filename,
          type,
          size: stats.size,
          path: filePath
        };
      })
    );

    return NextResponse.json(audioFiles);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
