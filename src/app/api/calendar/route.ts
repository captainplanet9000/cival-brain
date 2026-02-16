import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const WORKSPACE = path.resolve(process.cwd(), '..');
const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');

export const dynamic = 'force-dynamic';

function readLocal(month: string) {
  const days: Record<string, { journals: string[]; tasks: string[]; docs: string[]; count: number }> = {};
  let found = false;

  const addItem = (dateStr: string, type: 'journals' | 'tasks' | 'docs', label: string) => {
    if (!dateStr.startsWith(month)) return;
    const day = dateStr.slice(0, 10);
    if (!days[day]) days[day] = { journals: [], tasks: [], docs: [], count: 0 };
    days[day][type].push(label);
    days[day].count++;
    found = true;
  };

  const memDir = path.join(WORKSPACE, 'memory');
  if (fs.existsSync(memDir)) {
    fs.readdirSync(memDir).filter(f => f.endsWith('.md')).forEach(f => {
      const m = f.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) addItem(m[1], 'journals', f.replace('.md', ''));
    });
  }

  if (fs.existsSync(TASKS_FILE)) {
    JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8')).forEach((t: { title: string; createdAt: string }) => {
      if (t.createdAt) addItem(t.createdAt.slice(0, 10), 'tasks', t.title);
    });
  }

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

  return { days, found };
}

async function readSupabase(month: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('Missing Supabase env vars');

  const supabase = createClient(supabaseUrl, anonKey);
  const startDate = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const endDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('calendar_items')
    .select('item_date, item_type, label')
    .gte('item_date', startDate)
    .lt('item_date', m === 12 ? `${y + 1}-01-01` : endDate);

  if (error) throw new Error(error.message);

  const days: Record<string, { journals: string[]; tasks: string[]; docs: string[]; count: number }> = {};
  for (const row of data || []) {
    const day = row.item_date;
    if (!days[day]) days[day] = { journals: [], tasks: [], docs: [], count: 0 };
    const typeMap: Record<string, 'journals' | 'tasks' | 'docs'> = { journal: 'journals', task: 'tasks', doc: 'docs' };
    const bucket = typeMap[row.item_type] || 'docs';
    days[day][bucket].push(row.label);
    days[day].count++;
  }

  return days;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = searchParams.get('month') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, mon] = month.split('-').map(Number);
    const source = searchParams.get('source');

    let days: Record<string, { journals: string[]; tasks: string[]; docs: string[]; count: number }>;

    if (source === 'supabase') {
      days = await readSupabase(month);
    } else {
      const local = readLocal(month);
      if (local.found) {
        days = local.days;
      } else {
        // No local files (likely Vercel), fall back to Supabase
        try {
          days = await readSupabase(month);
        } catch {
          days = local.days; // empty
        }
      }
    }

    return NextResponse.json({ month, year, mon, days });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
