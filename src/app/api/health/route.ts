import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export async function GET() {
  const database = (async () => {
    try {
      const { error } = await getServiceSupabase().from('ops_agent_events').select('id').limit(1).abortSignal(AbortSignal.timeout(5000));
      return { status: error ? 'offline' : 'online' };
    } catch { return { status: 'offline' }; }
  })();
  const pipeline = (async () => {
    const configured = process.env.CIVAL_PIPELINE_HEALTH_URL;
    if (!configured) return { status: 'not_configured' };
    try {
      const url = new URL(configured);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || (process.env.VERCEL && local)) return { status: 'invalid_configuration' };
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000), redirect: 'error' });
      const result = response.ok ? await response.json() : null;
      return { status: response.ok && result?.ok === true ? 'online' : 'offline' };
    } catch { return { status: 'offline' }; }
  })();
  const [db, integration] = await Promise.all([database, pipeline]);
  return NextResponse.json({ database: db, pipeline: integration }, { headers: { 'Cache-Control': 'private, no-store' } });
}
