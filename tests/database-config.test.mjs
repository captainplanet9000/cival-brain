import test from 'node:test';
import assert from 'node:assert/strict';
import { getBrowserSupabase, getServiceSupabase } from '../src/lib/supabase.ts';

test('database module imports without credentials and service access never falls back to anon', () => {
  const names = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    assert.throws(getBrowserSupabase, /not configured/);
    assert.throws(getServiceSupabase, /not configured/);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-only-anonymous-key';
    assert.throws(getServiceSupabase, /not configured/);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test('service database client cannot be constructed in browser context', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
    assert.throws(getServiceSupabase, /server-only/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
    else delete globalThis.window;
  }
});
