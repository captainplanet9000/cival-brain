import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');
const PINS_FILE = path.join(process.cwd(), 'data', 'pins.json');

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').toLowerCase().trim();
    if (!q) return NextResponse.json([]);

    const results: { type: string; title: string; snippet: string; path?: string; icon: string }[] = [];

    // Search markdown files
    const searchDir = (dir: string, label: string) => {
      if (!fs.existsSync(dir)) return;
      const walk = (d: string) => {
        fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
          if (e.isDirectory()) walk(path.join(d, e.name));
          else if (e.name.endsWith('.md')) {
            const fp = path.join(d, e.name);
            const content = fs.readFileSync(fp, 'utf-8');
            const lower = content.toLowerCase();
            const idx = lower.indexOf(q);
            if (idx !== -1 || e.name.toLowerCase().includes(q)) {
              const start = Math.max(0, idx - 60);
              const snippet = idx !== -1 ? '...' + content.slice(start, start + 150).replace(/\n/g, ' ') + '...' : e.name;
              results.push({
                type: 'document', title: e.name.replace('.md', ''),
                snippet, path: path.relative(CONTENT_DIR, fp).replace(/\\/g, '/'), icon: '📄'
              });
            }
          }
        });
      };
      walk(dir);
    };

    searchDir(path.join(CONTENT_DIR, 'notes'), 'notes');
    searchDir(path.join(CONTENT_DIR, 'memory'), 'memory');

    // Search tasks
    if (fs.existsSync(TASKS_FILE)) {
      JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8')).forEach((t: { id: string; title: string; description: string; status: string }) => {
        if ((t.title + t.description).toLowerCase().includes(q)) {
          results.push({ type: 'task', title: t.title, snippet: `[${t.status}] ${t.description?.slice(0, 120) || ''}`, icon: '📋' });
        }
      });
    }

    // Search pins
    if (fs.existsSync(PINS_FILE)) {
      JSON.parse(fs.readFileSync(PINS_FILE, 'utf-8')).forEach((p: { id: string; content: string; tags: string[] }) => {
        if ((p.content + (p.tags || []).join(' ')).toLowerCase().includes(q)) {
          results.push({ type: 'pin', title: p.content.slice(0, 60), snippet: p.content, icon: '📌' });
        }
      });
    }

    return NextResponse.json(results);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
