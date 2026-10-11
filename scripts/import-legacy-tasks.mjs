import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { taskInput } from '../src/lib/task-input.ts';

// Explicit one-time import; never delete or overwrite the legacy source file.
const file = process.argv[2];
if (!file) throw new Error('Usage: node --experimental-strip-types scripts/import-legacy-tasks.mjs <tasks.json>');
const source = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(source)) throw new Error('Expected a task array');
const rows = source.map(task => {
  if (typeof task.id !== 'string' || !task.id || task.id.length > 200) throw new Error('Invalid legacy id');
  if (!Number.isFinite(Date.parse(task.createdAt))) throw new Error('Invalid legacy timestamp');
  return { ...taskInput(task), id: task.id, created_at: task.createdAt, updated_at: task.createdAt };
});
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Server database credentials required');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (let offset = 0; offset < rows.length; offset += 100) {
  const { error } = await db.from('brain_tasks').upsert(rows.slice(offset, offset + 100), { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw new Error('Task import failed; existing tasks were preserved');
}
console.log(`Imported ${rows.length} legacy tasks; existing ids and source file preserved.`);
