'use client';
import { FormEvent, useState } from 'react';

export default function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Sign-in failed');
      window.location.assign('/');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Sign-in failed'); }
    finally { setBusy(false); }
  }
  return <main style={{ maxWidth: 420, margin: '12vh auto', padding: 24 }}>
    <h1>Cival Brain</h1><p>Sign in to your private workspace.</p>
    <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
      <label>Email<input name="email" type="email" autoComplete="username" required style={{ display: 'block', width: '100%', padding: 12 }} /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required style={{ display: 'block', width: '100%', padding: 12 }} /></label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} type="submit" style={{ padding: 12 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </main>;
}
