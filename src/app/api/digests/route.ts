import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const WORKSPACE = path.resolve(process.cwd(), '..');
const DIGESTS_DIR = path.join(WORKSPACE, 'notes', 'digests');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!fs.existsSync(DIGESTS_DIR)) return NextResponse.json([]);
    const files = fs.readdirSync(DIGESTS_DIR).filter(f => f.endsWith('.md')).map(f => ({
      name: f.replace('.md', ''),
      path: `digests/${f}`,
      content: fs.readFileSync(path.join(DIGESTS_DIR, f), 'utf-8'),
      modified: fs.statSync(path.join(DIGESTS_DIR, f)).mtime.toISOString(),
    }));
    return NextResponse.json(files);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const week = body.week; // "YYYY-WW"
    if (!week || !/^\d{4}-\d{2}$/.test(week)) {
      return NextResponse.json({ error: 'Provide week as YYYY-WW' }, { status: 400 });
    }

    const [yearStr, weekStr] = week.split('-');
    const year = parseInt(yearStr);
    const weekNum = parseInt(weekStr);

    // Calculate week date range
    const jan1 = new Date(year, 0, 1);
    const startDate = new Date(jan1.getTime() + ((weekNum - 1) * 7 - jan1.getDay() + 1) * 86400000);
    const endDate = new Date(startDate.getTime() + 6 * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    let content = `# Weekly Digest: Week ${weekNum}, ${year}\n`;
    content += `**${fmt(startDate)} — ${fmt(endDate)}**\n\n`;

    // Journal entries
    content += `## 📓 Journal Entries\n\n`;
    const memDir = path.join(WORKSPACE, 'memory');
    let journalCount = 0;
    if (fs.existsSync(memDir)) {
      fs.readdirSync(memDir).filter(f => /^\d{4}-\d{2}-\d{2}/.test(f) && f.endsWith('.md')).forEach(f => {
        const d = f.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
        if (d && d >= fmt(startDate) && d <= fmt(endDate)) {
          const text = fs.readFileSync(path.join(memDir, f), 'utf-8');
          const firstLines = text.split('\n').slice(0, 5).join('\n');
          content += `### ${d}\n${firstLines}\n\n`;
          journalCount++;
        }
      });
    }
    if (!journalCount) content += `_No journal entries this week._\n\n`;

    // Git commits
    content += `## 🔀 Commits\n\n`;
    try {
      const log = execSync(
        `git log --after="${fmt(startDate)}" --before="${fmt(new Date(endDate.getTime() + 86400000))}" --format="- **%s** (%ai)"`,
        { cwd: WORKSPACE, encoding: 'utf-8' }
      );
      content += log || '_No commits this week._\n';
    } catch { content += '_Could not fetch git log._\n'; }
    content += '\n';

    // Tasks
    const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');
    if (fs.existsSync(TASKS_FILE)) {
      const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
      const weekTasks = tasks.filter((t: { createdAt: string }) =>
        t.createdAt && t.createdAt.slice(0, 10) >= fmt(startDate) && t.createdAt.slice(0, 10) <= fmt(endDate)
      );
      content += `## ✅ Tasks (${weekTasks.length})\n\n`;
      weekTasks.forEach((t: { title: string; status: string }) => {
        content += `- [${t.status}] ${t.title}\n`;
      });
      if (!weekTasks.length) content += `_No tasks created this week._\n`;
    }

    // Save
    if (!fs.existsSync(DIGESTS_DIR)) fs.mkdirSync(DIGESTS_DIR, { recursive: true });
    const filename = `week-${week}.md`;
    fs.writeFileSync(path.join(DIGESTS_DIR, filename), content);

    return NextResponse.json({ name: filename, content, path: `digests/${filename}` }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
