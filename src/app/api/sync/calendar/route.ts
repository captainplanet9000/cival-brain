import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const WORKSPACE = path.resolve(process.cwd(), '..');
const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');

export async function POST() {
  try {
    const supabase = getServiceSupabase();
    const items: { item_date: string; item_type: string; label: string; file_path: string; content_preview: string }[] = [];

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
            content_preview: content.slice(0, 200),
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
            content_preview: t.title,
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
            const fullPath = path.join(d, e.name);
            const stat = fs.statSync(fullPath);
            const relPath = path.relative(WORKSPACE, fullPath).replace(/\\/g, '/');
            const content = fs.readFileSync(fullPath, 'utf-8');
            items.push({
              item_date: stat.mtime.toISOString().slice(0, 10),
              item_type: 'doc',
              label: e.name.replace('.md', ''),
              file_path: relPath,
              content_preview: content.slice(0, 200),
            });
          }
        }
      };
      walk(notesDir);
    }

    // Upsert in batches
    let synced = 0;
    const batchSize = 50;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const { error } = await supabase
        .from('calendar_items')
        .upsert(batch.map(item => ({ ...item, synced_at: new Date().toISOString() })), {
          onConflict: 'item_date,item_type,label',
        });
      if (error) {
        console.error('Upsert error:', error);
        return NextResponse.json({ error: error.message, synced }, { status: 500 });
      }
      synced += batch.length;
    }

    return NextResponse.json({ synced, journals: items.filter(i => i.item_type === 'journal').length, tasks: items.filter(i => i.item_type === 'task').length, docs: items.filter(i => i.item_type === 'doc').length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
