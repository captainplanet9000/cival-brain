import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PINS_FILE = path.join(process.cwd(), 'data', 'pins.json');

function readPins() {
  if (!fs.existsSync(PINS_FILE)) return [];
  return JSON.parse(fs.readFileSync(PINS_FILE, 'utf-8'));
}

function writePins(pins: unknown[]) {
  fs.writeFileSync(PINS_FILE, JSON.stringify(pins, null, 2));
}

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const pins = readPins();
    const idx = pins.findIndex((p: { id: string }) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    pins[idx] = { ...pins[idx], ...body, id };
    writePins(pins);
    return NextResponse.json(pins[idx]);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let pins = readPins();
    pins = pins.filter((p: { id: string }) => p.id !== id);
    writePins(pins);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete pin' }, { status: 500 });
  }
}
