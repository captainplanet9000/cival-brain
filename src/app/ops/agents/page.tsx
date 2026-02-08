'use client';

import { useEffect, useState } from 'react';

interface Agent {
  id: string; name: string; role?: string; description?: string; status?: string;
  capabilities?: any; config?: any; last_active_at?: string;
  eventCount: number; memoryCount?: number;
}
interface Memory { id: string; agent_id: string; type: string; content: string; confidence: number; tags: string[]; created_at: string; }
interface AgentEvent { id: string; agent_id: string; kind: string; title: string; summary: string; created_at: string; }

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [tab, setTab] = useState<'events' | 'memories'>('events');

  useEffect(() => {
    fetch('/api/ops/agents').then(r => r.json()).then(d => Array.isArray(d) ? setAgents(d) : []);
  }, []);

  const loadAgent = async (agentId: string) => {
    setSelectedAgent(agentId);
    setTab('events');
    const [memRes, evtRes] = await Promise.all([
      fetch(`/api/ops/memory?agent_id=${agentId}`).then(r => r.json()),
      fetch(`/api/ops/events?agent_id=${agentId}&limit=20`).then(r => r.json()),
    ]);
    setMemories(Array.isArray(memRes) ? memRes : []);
    setEvents(Array.isArray(evtRes) ? evtRes : []);
  };

  const statusColor = (s?: string) => {
    if (s === 'active' || s === 'online') return 'var(--green)';
    if (s === 'idle') return 'var(--amber)';
    return 'var(--text-tertiary)';
  };

  const selectedData = agents.find(a => a.id === selectedAgent);

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 24 }}>🤖 Agents</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 32 }}>
        {agents.map(a => (
          <div
            key={a.id}
            className={`ops-agent-detail-card ${selectedAgent === a.id ? 'active' : ''}`}
            onClick={() => loadAgent(a.id)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                🤖
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{a.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{a.role || a.id}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: statusColor(a.status) }}>
                ● {a.status || 'unknown'}
              </span>
            </div>
            {a.description && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10 }}>{a.description}</div>
            )}
            <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              <span>{a.eventCount} events</span>
              <span>{a.memoryCount || 0} memories</span>
              {a.last_active_at && <span>Last: {new Date(a.last_active_at).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
        {agents.length === 0 && <div className="empty-state"><p>No agents found</p></div>}
      </div>

      {selectedAgent && selectedData && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setTab('events')} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', cursor: 'pointer', border: '1px solid var(--border-subtle)',
              background: tab === 'events' ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              color: tab === 'events' ? 'var(--accent)' : 'var(--text-secondary)',
            }}>📡 Events ({events.length})</button>
            <button onClick={() => setTab('memories')} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', cursor: 'pointer', border: '1px solid var(--border-subtle)',
              background: tab === 'memories' ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              color: tab === 'memories' ? 'var(--accent)' : 'var(--text-secondary)',
            }}>🧠 Memories ({memories.length})</button>
          </div>

          {tab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 16 }}>No events recorded</div>
              ) : events.map(e => (
                <div key={e.id} className="ops-feed-item" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                  <div className="ops-feed-dot" style={{ background: 'var(--accent)' }} />
                  <div style={{ flex: 1 }}>
                    <div className="ops-feed-title">{e.title}</div>
                    <div className="ops-feed-summary">{e.summary}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                      {e.kind} · {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'memories' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memories.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 16 }}>No memories recorded</div>
              ) : memories.map(m => (
                <div key={m.id} className="ops-memory-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="badge badge-notes">{m.type}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      confidence: {m.confidence} · {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{m.content}</div>
                  {m.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      {m.tags.map(t => <span key={t} className="kanban-tag">{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
