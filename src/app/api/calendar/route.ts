import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const WORKSPACE = path.resolve(process.cwd(), '..');
const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = searchParams.get('month') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, mon] = month.split('-').map(Number);

    const days: Record<string, { journals: string[]; tasks: string[]; docs: string[]; count: number }> = {};
    const addItem = (dateStr: string, type: 'journals' | 'tasks' | 'docs', label: string) => {
      if (!dateStr.startsWith(month)) return;
      const day = dateStr.slice(0, 10);
      if (!days[day]) days[day] = { journals: [], tasks: [], docs: [], count: 0 };
      days[day][type].push(label);
      days[day].count++;
    };

    // Memory journals
    const memDir = path.join(WORKSPACE, 'memory');
    if (fs.existsSync(memDir)) {
      fs.readdirSync(memDir).filter(f => f.endsWith('.md')).forEach(f => {
        const m = f.match(/(\d{4}-\d{2}-\d{2})/);
        if (m) addItem(m[1], 'journals', f.replace('.md', ''));
      });
    }

    // Tasks
    if (fs.existsSync(TASKS_FILE)) {
      JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8')).forEach((t: { title: string; createdAt: string }) => {
        if (t.createdAt) addItem(t.createdAt.slice(0, 10), 'tasks', t.title);
      });
    }

    // Doc modifications in notes/
    const notesDir = path.join(WORKSPACE, 'notes');
    if (fs.existsSync(notesDir)) {
      const walk = (d: string) => {
        fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
          if (e.isDirectory()) walk(path.join(d, e.name));
          else if (e.name.endsWith('.md')) {
            const stat = fs.statSync(path.join(d, e.name));
            addItem(stat.mtime.toISOString().slice(0, 10), 'docs', e.name.replace('.md', ''));
          }
        });
      };
      walk(notesDir);
    }

    return NextResponse.json({ month, year, mon, days });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
