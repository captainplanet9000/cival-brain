import test from 'node:test';
import assert from 'node:assert/strict';
import { taskInput, readTaskBody } from '../src/lib/task-input.ts';
test('tasks reject invalid states and discard caller-controlled identity fields', () => {
  assert.throws(() => taskInput({ title: 'Task', status: 'invented' }));
  assert.throws(() => taskInput({ title: ' ' }));
  assert.throws(() => taskInput({ title: 'Task', tags: [42] }));
  assert.throws(() => taskInput({ id: 'x' }, true));
  assert.deepEqual(taskInput({ title: 'Task', id: 'stolen', created_at: 'yesterday', tags: ['a', 'a'] }), {
    title: 'Task', description: '', status: 'backlog', priority: 'medium', tags: ['a'],
  });
  assert.deepEqual(taskInput({ status: 'done' }, true), { status: 'done' });
});
test('task request limit applies to streamed bodies without a content-length', async () => {
  const request = new Request('http://localhost/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'x'.repeat(33000) }) });
  await assert.rejects(readTaskBody(request), /too large/);
  assert.deepEqual(await readTaskBody(new Request('http://localhost', { method: 'POST', body: '{"title":"Valid"}' })), { title: 'Valid' });
});
