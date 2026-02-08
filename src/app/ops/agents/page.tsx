'use client';

import { useEffect, useState } from 'react';

interface Agent { id: string; name: string; eventCount: number; memoryCount?: number; lastEvent: any; }
interface Memory { id: string; agent_id: string; type: string; content: string; confidence: number; tags: string[]; created_at: string; }

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ops/agents').then(r => r.json()).then(d => Array.isArray(d) ? setAgents(d) : []);
  }, []);

  const loadMemories = async (agentId: string) => {
    setSelectedAgent(agentId);
    const res = await fetch(`/api/ops/memory?agent_id=${agentId}`);
    const data = await res.json();
    setMemories(Array.isArray(data) ? data : []);
  };

  const agentColors: Record<string, string> = { coordinator: 'var(--accent)', 'content-creator': 'var(--green)', observer: 'var(--amber)' };
  const agentDescriptions: Record<string, string> = {
    coordinator: 'Manages priorities across all GWDS business units',
    'content-creator': 'Manages TikTok content pipeline across all channels',
    observer: 'Monitors system health, reviews outcomes, writes lessons',
  };

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 24 }}>🤖 Agents</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 32 }}>
        {agents.map(a => (
          <div
            key={a.id}
            className={`ops-agent-detail-card ${selectedAgent === a.id ? 'active' : ''}`}
            onClick={() => loadMemories(a.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: agentColors[a.id] || 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                {a.id === 'coordinator' ? '🎯' : a.id === 'content-creator' ? '🎬' : '👁️'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{a.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{a.id}</div>
              </div>
              <span className="badge badge-areas" style={{ marginLeft: 'auto' }}>online</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
              {agentDescriptions[a.id] || 'Agent'}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              <span>{a.eventCount} events</span>
              <span>{a.memoryCount || 0} memories</span>
            </div>
          </div>
        ))}
      </div>

      {selectedAgent && (
        <div>
          <div className="section-heading">Memories — {selectedAgent}</div>
          {memories.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 16 }}>No memories recorded yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memories.map(m => (
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
