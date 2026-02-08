import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PINS_FILE = path.join(process.cwd(), 'data', 'pins.json');

function readPins() {
  if (!fs.existsSync(PINS_FILE)) return [];
  return JSON.parse(fs.readFileSync(PINS_FILE, 'utf-8'));
}
function writePins(pins: unknown[]) {
  const dir = path.dirname(PINS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PINS_FILE, JSON.stringify(pins, null, 2));
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try { return NextResponse.json(readPins()); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pins = readPins();
    const pin = {
      id: `pin-${Date.now()}`,
      content: body.content || '',
      color: body.color || 'yellow',
      tags: body.tags || [],
      pinned: body.pinned ?? false,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    pins.push(pin);
    writePins(pins);
    return NextResponse.json(pin, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const pins = readPins();
    const idx = pins.findIndex((p: { id: string }) => p.id === body.id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    pins[idx] = { ...pins[idx], ...body };
    writePins(pins);
    return NextResponse.json(pins[idx]);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    let pins = readPins();
    pins = pins.filter((p: { id: string }) => p.id !== id);
    writePins(pins);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
