import test from 'node:test';
import assert from 'node:assert/strict';
import { isBrainAdministrator, officePermission, validOfficeToken } from '../src/lib/brain-auth.ts';

test('only verified owners and server-managed roles are administrators', () => {
  assert.equal(isBrainAdministrator(null, 'owner@example.test'), false);
  assert.equal(isBrainAdministrator({ email: 'owner@example.test' }, 'owner@example.test'), false);
  assert.equal(isBrainAdministrator({ email: 'other@example.test', email_confirmed_at: '2026-10-09' }, 'owner@example.test'), false);
  assert.equal(isBrainAdministrator({ email: 'OWNER@example.test', email_confirmed_at: '2026-10-09' }, 'owner@example.test'), true);
  assert.equal(isBrainAdministrator({ email: 'other@example.test', email_confirmed_at: '2026-10-09', app_metadata: { cival_brain_role: 'admin' } }, ''), true);
});

test('Office credentials have exactly seven reads and one idempotent write', () => {
  assert.equal(officePermission('/api/ops/business-units', 'GET'), true);
  assert.equal(officePermission('/api/tasks', 'POST'), false);
  assert.equal(officePermission('/api/ops/events', 'POST'), false);
  assert.equal(officePermission('/api/brain-agents/seed', 'POST'), false);
  assert.equal(officePermission('/api/integrations/cival-office', 'POST'), true);
  assert.equal(officePermission('/api/tasks/../setup', 'GET'), false);
});

test('missing, malformed and incorrect machine credentials fail closed', async () => {
  const previous = process.env.CIVAL_BRAIN_TOKEN;
  try {
    delete process.env.CIVAL_BRAIN_TOKEN;
    assert.equal(await validOfficeToken(''), false);
    process.env.CIVAL_BRAIN_TOKEN = 'test-only-machine-token-'.repeat(2);
    assert.equal(await validOfficeToken('x'.repeat(process.env.CIVAL_BRAIN_TOKEN.length)), false);
    assert.equal(await validOfficeToken(process.env.CIVAL_BRAIN_TOKEN), true);
  } finally {
    if (previous === undefined) delete process.env.CIVAL_BRAIN_TOKEN;
    else process.env.CIVAL_BRAIN_TOKEN = previous;
  }
});
