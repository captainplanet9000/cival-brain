import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WORKSPACE = path.resolve(process.cwd(), '..');
const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const items: { item_date: string; item_type: string; label: string; file_path: string; content_preview: string | null }[] = [];

    // 1. Memory journals
    const memDir = path.join(WORKSPACE, 'memory');
    if (fs.existsSync(memDir)) {
      for (const f of fs.readdirSync(memDir).filter(f => f.endsWith('.md'))) {
        const m = f.match(/(\d{4}-\d{2}-\d{2})/);
        if (m) {
          const content = fs.readFileSync(path.join(memDir, f), 'utf-8');
          items.push({
            item_date: m[1],
            item_type: 'journal',
            label: f.replace('.md', ''),
            file_path: `memory/${f}`,
            content_preview: content.slice(0, 300) || null,
          });
        }
      }
    }

    // 2. Tasks
    if (fs.existsSync(TASKS_FILE)) {
      const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
      for (const t of tasks) {
        if (t.createdAt) {
          items.push({
            item_date: t.createdAt.slice(0, 10),
            item_type: 'task',
            label: t.title,
            file_path: 'data/tasks.json',
            content_preview: t.description?.slice(0, 300) || null,
          });
        }
      }
    }

    // 3. Notes/docs
    const notesDir = path.join(WORKSPACE, 'notes');
    if (fs.existsSync(notesDir)) {
      const walk = (d: string) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          if (e.isDirectory()) walk(path.join(d, e.name));
          else if (e.name.endsWith('.md')) {
            const fp = path.join(d, e.name);
            const stat = fs.statSync(fp);
            const content = fs.readFileSync(fp, 'utf-8');
            const relPath = path.relative(WORKSPACE, fp).replace(/\\/g, '/');
            items.push({
              item_date: stat.mtime.toISOString().slice(0, 10),
              item_type: 'doc',
              label: e.name.replace('.md', ''),
              file_path: relPath,
              content_preview: content.slice(0, 300) || null,
            });
          }
        }
      };
      walk(notesDir);
    }

    // Upsert in batches of 100
    let synced = 0;
    for (let i = 0; i < items.length; i += 100) {
      const batch = items.slice(i, i + 100);
      const { error } = await supabase
        .from('calendar_items')
        .upsert(batch, { onConflict: 'item_date,item_type,label' });
      if (error) {
        return NextResponse.json({ error: error.message, synced }, { status: 500 });
      }
      synced += batch.length;
    }

    return NextResponse.json({ synced, breakdown: { journals: items.filter(i => i.item_type === 'journal').length, tasks: items.filter(i => i.item_type === 'task').length, docs: items.filter(i => i.item_type === 'doc').length } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
