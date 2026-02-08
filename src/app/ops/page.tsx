'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AgentEvent { id: string; agent_id: string; kind: string; title: string; summary: string; tags: string[]; created_at: string; }
interface Mission { id: string; title: string; status: string; created_by: string; created_at: string; ops_mission_steps: any[]; }
interface Agent { id: string; name: string; eventCount: number; memoryCount?: number; lastEvent: any; }

export default function OpsPage() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [heartbeat, setHeartbeat] = useState<any>(null);

  useEffect(() => {
    fetch('/api/ops/events?limit=20').then(r => r.json()).then(setEvents);
    fetch('/api/ops/missions').then(r => r.json()).then(setMissions);
    fetch('/api/ops/agents').then(r => r.json()).then(setAgents);
    fetch('/api/ops/heartbeat').then(r => r.json()).then(setHeartbeat);
  }, []);

  const activeMissions = Array.isArray(missions) ? missions.filter(m => m.status === 'approved') : [];
  const agentColors: Record<string, string> = { coordinator: 'var(--accent)', 'content-creator': 'var(--green)', observer: 'var(--amber)' };

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <div className="dash-hero">
        <h1>🎯 Operations Hub</h1>
        <p>Multi-agent command center for GWDS</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Agents</div>
          <div className="stat-value">{agents.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Missions</div>
          <div className="stat-value">{activeMissions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Events (24h)</div>
          <div className="stat-value">{heartbeat?.stats?.events ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Content Items</div>
          <div className="stat-value">{heartbeat?.stats?.content_items ?? '—'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Signal Feed */}
        <div>
          <div className="section-heading">Signal Feed</div>
          <div className="ops-feed">
            {events.map(e => (
              <div key={e.id} className="ops-feed-item">
                <div className="ops-feed-dot" style={{ background: agentColors[e.agent_id] || 'var(--text-tertiary)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ops-feed-title">{e.title}</div>
                  <div className="ops-feed-summary">{e.summary}</div>
                  <div className="ops-feed-meta">
                    <span className="badge badge-notes">{e.agent_id}</span>
                    <span>{e.kind}</span>
                    <span>{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && <div className="empty-state"><p>No events yet</p></div>}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Agent Cards */}
          <div className="section-heading">Agents</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {agents.map(a => (
              <Link key={a.id} href="/ops/agents" className="ops-agent-card" style={{ textDecoration: 'none' }}>
                <div className="ops-agent-dot" style={{ background: agentColors[a.id] || 'var(--purple)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{a.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {a.eventCount} events · {a.memoryCount || 0} memories
                  </div>
                </div>
                <span className="badge badge-areas">online</span>
              </Link>
            ))}
          </div>

          {/* Active Missions */}
          <div className="section-heading">Active Missions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeMissions.map(m => (
              <Link key={m.id} href="/ops/missions" className="ops-mission-card" style={{ textDecoration: 'none' }}>
                <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{m.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', gap: 8 }}>
                  <span>{m.created_by}</span>
                  <span>{m.ops_mission_steps?.length || 0} steps</span>
                </div>
              </Link>
            ))}
            {activeMissions.length === 0 && <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 16 }}>No active missions</div>}
          </div>
        </div>
      </div>

      {/* Quick Nav */}
      <div className="quick-links" style={{ marginTop: 32 }}>
        <Link href="/ops/missions" className="quick-link-card">📋 Missions</Link>
        <Link href="/ops/agents" className="quick-link-card">🤖 Agents</Link>
        <Link href="/projects" className="quick-link-card">🏢 Projects</Link>
        <Link href="/content" className="quick-link-card">🎬 Content</Link>
      </div>
    </div>
  );
}
