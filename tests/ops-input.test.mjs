import test from 'node:test';
import assert from 'node:assert/strict';
import { missionUpdates, eventInput } from '../src/lib/ops-input.ts';
test('mission updates cannot overwrite ownership and server timestamps', () => {
  const id = '12345678-1234-1234-1234-123456789abc';
  assert.deepEqual(missionUpdates({ id, title: 'Changed', created_by: 'other', created_at: 'x' }), { title: 'Changed' });
  assert.throws(() => missionUpdates({ id, status: 'invented' }));
  assert.throws(() => missionUpdates({ id: 'not-uuid', title: 'Changed' }));
  assert.throws(() => missionUpdates({ id, created_by: 'other' }));
  assert.equal(missionUpdates({ id, status: 'in_progress' }).completed_at, null);
  assert.ok(Number.isFinite(Date.parse(missionUpdates({ id, status: 'completed' }).completed_at)));
});
test('events validate fields and preserve only supported data', () => {
  assert.deepEqual(eventInput({ kind: 'task', id: 'stolen', created_at: 'x', tags: ['a', 'a'] }), { kind: 'task', tags: ['a'] });
  for (const body of [{}, { kind: ' ' }, { kind: 'x', tags: [1] }, { kind: 'x', metadata: [] }, { kind: 'x', title: 'x'.repeat(301) }]) assert.throws(() => eventInput(body));
});
