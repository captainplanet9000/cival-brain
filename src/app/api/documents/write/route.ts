import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const NOTES_DIR = path.join('C:', 'Users', 'Anthony', 'clawd', 'notes');

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const { filepath, content } = body;
  if (!filepath || content === undefined) {
    return NextResponse.json({ error: 'Missing filepath or content' }, { status: 400 });
  }

  // Only allow writing under notes/
  const fullPath = path.join(NOTES_DIR, filepath);
  if (!fullPath.startsWith(NOTES_DIR)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  return NextResponse.json({ ok: true, path: filepath });
}
