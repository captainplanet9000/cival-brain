import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const WORKSPACE = path.resolve(process.cwd(), '..');
const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const items: { type: string; title: string; preview: string; date: string; icon: string }[] = [];

    // Git commits
    try {
      const log = execSync('git log --format="%H|||%s|||%ai" -50', { cwd: WORKSPACE, encoding: 'utf-8' });
      log.trim().split('\n').filter(Boolean).forEach(line => {
        const [hash, msg, date] = line.split('|||');
        items.push({ type: 'commit', title: msg, preview: hash?.slice(0, 7) || '', date, icon: '🔀' });
      });
    } catch {}

    // Memory journal files
    const memDir = path.join(WORKSPACE, 'memory');
    if (fs.existsSync(memDir)) {
      fs.readdirSync(memDir).filter(f => /^\d{4}-\d{2}-\d{2}/.test(f) && f.endsWith('.md')).forEach(f => {
        const content = fs.readFileSync(path.join(memDir, f), 'utf-8');
        const dateMatch = f.match(/(\d{4}-\d{2}-\d{2})/);
        items.push({
          type: 'journal', title: `Journal: ${f.replace('.md', '')}`,
          preview: content.slice(0, 150).replace(/[#\n]/g, ' ').trim(),
          date: dateMatch ? dateMatch[1] + 'T12:00:00Z' : new Date().toISOString(), icon: '📓'
        });
      });
    }

    // Tasks
    if (fs.existsSync(TASKS_FILE)) {
      const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
      tasks.forEach((t: { title: string; description: string; createdAt: string; status: string }) => {
        items.push({ type: 'task', title: t.title, preview: `${t.status} — ${t.description?.slice(0, 100) || ''}`, date: t.createdAt, icon: '✅' });
      });
    }

    // Document modifications
    const scanDir = (dir: string, label: string) => {
      if (!fs.existsSync(dir)) return;
      const walk = (d: string) => {
        fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
          if (e.isDirectory()) walk(path.join(d, e.name));
          else if (e.name.endsWith('.md')) {
            const fp = path.join(d, e.name);
            const stat = fs.statSync(fp);
            items.push({
              type: 'doc', title: `${label}: ${e.name.replace('.md', '')}`,
              preview: '', date: stat.mtime.toISOString(), icon: '📝'
            });
          }
        });
      };
      walk(dir);
    };
    scanDir(path.join(WORKSPACE, 'notes'), 'Note');

    let filtered = typeFilter ? items.filter(i => i.type === typeFilter) : items;
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json(filtered.slice(0, limit));
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
