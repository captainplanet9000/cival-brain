import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { readTaskBody, taskInput } from '@/lib/task-input';
export const dynamic = 'force-dynamic';
const columns = 'id,title,description,status,priority,tags,created_at,updated_at';
function present(row: Record<string, unknown>) {
  const { created_at, updated_at, ...task } = row;
  return { ...task, createdAt: created_at, updatedAt: updated_at };
}
function unavailable() { return NextResponse.json({ error: 'Task storage is unavailable. Your changes were not saved.' }, { status: 503 }); }
function invalid(error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid task' }, { status: 400 }); }
export async function GET() {
  try {
    const { data, error } = await getServiceSupabase().from('brain_tasks').select(columns).order('created_at', { ascending: true }).limit(5000);
    return error ? unavailable() : NextResponse.json((data ?? []).map(present));
  } catch { return unavailable(); }
}
export async function POST(request: Request) {
  let input;
  try { input = taskInput(await readTaskBody(request)); } catch (error) { return invalid(error); }
  try {
    const { data, error } = await getServiceSupabase().from('brain_tasks').insert({ ...input, id: randomUUID() }).select(columns).single();
    return error ? unavailable() : NextResponse.json(present(data), { status: 201 });
  } catch { return unavailable(); }
}
export async function PUT(request: Request) {
  let body, input;
  try {
    body = await readTaskBody(request);
    if (typeof body.id !== 'string' || !body.id || body.id.length > 200) throw new Error('Invalid task id');
    input = taskInput(body, true);
  } catch (error) { return invalid(error); }
  try {
    const { data, error } = await getServiceSupabase().from('brain_tasks').update({ ...input, updated_at: new Date().toISOString() }).eq('id', body.id).select(columns).maybeSingle();
    return error ? unavailable() : data ? NextResponse.json(present(data)) : NextResponse.json({ error: 'Task not found' }, { status: 404 });
  } catch { return unavailable(); }
}
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || id.length > 200) return invalid(new Error('Invalid task id'));
  try {
    const { data, error } = await getServiceSupabase().from('brain_tasks').delete().eq('id', id).select('id').maybeSingle();
    return error ? unavailable() : data ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Task not found' }, { status: 404 });
  } catch { return unavailable(); }
}
