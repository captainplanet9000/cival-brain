import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');

function readTasks() {
  if (!fs.existsSync(TASKS_FILE)) return [];
  return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
}

function writeTasks(tasks: unknown[]) {
  const dir = path.dirname(TASKS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(readTasks());
}

export async function POST(req: Request) {
  const body = await req.json();
  const tasks = readTasks();
  const task = {
    id: `task-${Date.now()}`,
    title: body.title || 'Untitled',
    description: body.description || '',
    status: body.status || 'backlog',
    priority: body.priority || 'medium',
    createdAt: new Date().toISOString(),
    tags: body.tags || [],
  };
  tasks.push(task);
  writeTasks(tasks);
  return NextResponse.json(task, { status: 201 });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const tasks = readTasks();
  const idx = tasks.findIndex((t: { id: string }) => t.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  tasks[idx] = { ...tasks[idx], ...body };
  writeTasks(tasks);
  return NextResponse.json(tasks[idx]);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  let tasks = readTasks();
  tasks = tasks.filter((t: { id: string }) => t.id !== id);
  writeTasks(tasks);
  return NextResponse.json({ ok: true });
}
