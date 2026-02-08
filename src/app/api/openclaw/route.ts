import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'https://desktop-2948l01.taile3b948.ts.net';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    const { action, params } = await req.json();

    if (!GATEWAY_TOKEN) {
      return NextResponse.json({ error: 'OpenClaw gateway token not configured' }, { status: 500 });
    }

    if (action === 'chat') {
      const message = params?.message;
      if (!message) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
      }

      const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          tool: 'sessions_send',
          args: { message, label: 'cival-brain-chat' },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `Gateway error: ${res.status}`, details: errText },
          { status: res.status }
        );
      }

      const data = await res.json();
      return NextResponse.json({ response: data.result || data.message || data.output || JSON.stringify(data) });
    }

    if (action === 'search') {
      // Brain search across Supabase tables
      const query = (params?.query || '').toLowerCase().trim();
      if (!query) return NextResponse.json({ results: [] });

      const { getServiceSupabase } = await import('@/lib/supabase');
      const sb = getServiceSupabase();
      const results: { type: string; title: string; snippet: string; icon: string }[] = [];

      // Search ops_agents
      const { data: agents } = await sb.from('ops_agents').select('name, role, description, status');
      agents?.forEach(a => {
        if ([a.name, a.role, a.description].join(' ').toLowerCase().includes(query)) {
          results.push({ type: 'agent', title: a.name, snippet: `${a.role} — ${a.description || ''}`, icon: '🤖' });
        }
      });

      // Search ops_missions
      const { data: missions } = await sb.from('ops_missions').select('title, status, created_by');
      missions?.forEach(m => {
        if ([m.title, m.created_by].join(' ').toLowerCase().includes(query)) {
          results.push({ type: 'mission', title: m.title, snippet: `${m.status} — by ${m.created_by}`, icon: '📋' });
        }
      });

      // Search ops_business_units
      const { data: units } = await sb.from('ops_business_units').select('name, description, icon, status');
      units?.forEach(u => {
        if ([u.name, u.description].join(' ').toLowerCase().includes(query)) {
          results.push({ type: 'project', title: `${u.icon} ${u.name}`, snippet: u.description || u.status, icon: '🏢' });
        }
      });

      // Search ops_agent_events
      const { data: events } = await sb.from('ops_agent_events').select('title, summary, agent_id, kind').limit(100);
      events?.forEach(e => {
        if ([e.title, e.summary, e.agent_id].join(' ').toLowerCase().includes(query)) {
          results.push({ type: 'event', title: e.title, snippet: e.summary || e.kind, icon: '📡' });
        }
      });

      // Search ops_content_pipeline
      const { data: content } = await sb.from('ops_content_pipeline').select('title, stage, channel');
      content?.forEach(c => {
        if ([c.title, c.channel].join(' ').toLowerCase().includes(query)) {
          results.push({ type: 'content', title: c.title, snippet: `${c.stage} — ${c.channel || ''}`, icon: '🎬' });
        }
      });

      // Search revenue_entries
      const { data: revenue } = await sb.from('revenue_entries').select('source, description, amount, currency');
      revenue?.forEach(r => {
        if ([r.source, r.description].join(' ').toLowerCase().includes(query)) {
          results.push({ type: 'revenue', title: r.source, snippet: `${r.amount} ${r.currency} — ${r.description || ''}`, icon: '💰' });
        }
      });

      return NextResponse.json({ results });
    }

    if (action === 'status') {
      try {
        const res = await fetch(`${GATEWAY_URL}/health`, {
          headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
        });
        if (res.ok) {
          return NextResponse.json({ status: 'online' });
        }
        return NextResponse.json({ status: 'offline' });
      } catch {
        return NextResponse.json({ status: 'offline' });
      }
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
