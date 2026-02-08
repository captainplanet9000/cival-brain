'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AgentEvent { id: string; agent_id: string; kind: string; title: string; summary: string; tags: string[]; created_at: string; }
interface Mission { id: string; title: string; status: string; created_by: string; created_at: string; ops_mission_steps: any[]; }
interface Agent { id: string; name: string; eventCount: number; memoryCount?: number; lastEvent: any; }
interface Proposal { id: string; agent_id: string; title: string; status: string; proposed_steps: any; rejection_reason: string; created_at: string; }

export default function OpsPage() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [heartbeat, setHeartbeat] = useState<any>(null);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({ title: '', agent_id: 'coordinator' });

  const load = () => {
    fetch('/api/ops/events?limit=20').then(r => r.json()).then(setEvents);
    fetch('/api/ops/missions').then(r => r.json()).then(setMissions);
    fetch('/api/ops/agents').then(r => r.json()).then(setAgents);
    fetch('/api/ops/heartbeat').then(r => r.json()).then(setHeartbeat).catch(() => {});
    fetch('/api/ops/proposals').then(r => r.json()).then(d => Array.isArray(d) ? setProposals(d) : []);
  };

  useEffect(() => { load(); }, []);

  const createProposal = async () => {
    if (!proposalForm.title.trim()) return;
    await fetch('/api/ops/proposals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...proposalForm, status: 'pending' }),
    });
    setProposalForm({ title: '', agent_id: 'coordinator' });
    setShowCreateProposal(false);
    load();
  };

  const updateProposal = async (id: string, status: string, rejection_reason?: string) => {
    await fetch('/api/ops/proposals', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, ...(rejection_reason ? { rejection_reason } : {}) }),
    });
    // If approved, create a mission
    if (status === 'approved') {
      const p = proposals.find(p => p.id === id);
      if (p) {
        await fetch('/api/ops/missions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: p.title, created_by: p.agent_id, proposal_id: p.id, status: 'approved' }),
        });
      }
    }
    load();
  };

  const activeMissions = Array.isArray(missions) ? missions.filter(m => m.status === 'approved') : [];
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const agentColors: Record<string, string> = { coordinator: 'var(--accent)', 'content-creator': 'var(--green)', observer: 'var(--amber)' };

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <div className="dash-hero">
        <h1>🎯 Operations Hub</h1>
        <p>Multi-agent command center for GWDS</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Agents</div><div className="stat-value">{agents.length}</div></div>
        <div className="stat-card"><div className="stat-label">Active Missions</div><div className="stat-value">{activeMissions.length}</div></div>
        <div className="stat-card"><div className="stat-label">Pending Proposals</div><div className="stat-value">{pendingProposals.length}</div></div>
        <div className="stat-card"><div className="stat-label">Events (24h)</div><div className="stat-value">{heartbeat?.stats?.events ?? events.length}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="ops-grid">
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
          {/* Proposals */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-heading">Proposals</div>
            <button className="btn-primary" style={{ fontSize: '0.78rem', padding: '4px 12px' }} onClick={() => setShowCreateProposal(!showCreateProposal)}>+ New</button>
          </div>

          {showCreateProposal && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 12 }}>
              <input className="modal-input" placeholder="Proposal title..." value={proposalForm.title} onChange={e => setProposalForm({ ...proposalForm, title: e.target.value })} style={{ marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="modal-select" value={proposalForm.agent_id} onChange={e => setProposalForm({ ...proposalForm, agent_id: e.target.value })}>
                  <option value="coordinator">Coordinator</option>
                  <option value="content-creator">Content Creator</option>
                  <option value="observer">Observer</option>
                </select>
                <button className="btn-primary" onClick={createProposal}>Submit</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {proposals.slice(0, 10).map(p => (
              <div key={p.id} className="ops-mission-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{p.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.agent_id} · {new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`badge ${p.status === 'pending' ? 'badge-notes' : p.status === 'approved' ? 'badge-areas' : 'badge-archive'}`}>{p.status}</span>
                </div>
                {p.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button className="btn-small" style={{ background: 'var(--green-subtle)', color: 'var(--green)', fontSize: '0.75rem' }} onClick={() => updateProposal(p.id, 'approved')}>✓ Approve</button>
                    <button className="btn-small" style={{ background: 'var(--rose-subtle)', color: 'var(--rose)', fontSize: '0.75rem' }} onClick={() => updateProposal(p.id, 'rejected', 'Rejected by user')}>✕ Reject</button>
                  </div>
                )}
              </div>
            ))}
            {proposals.length === 0 && <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 16 }}>No proposals</div>}
          </div>

          {/* Agent Cards */}
          <div className="section-heading">Agents</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {agents.map(a => (
              <Link key={a.id} href="/ops/agents" className="ops-agent-card" style={{ textDecoration: 'none' }}>
                <div className="ops-agent-dot" style={{ background: agentColors[a.id] || 'var(--purple)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{a.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{a.eventCount} events · {a.memoryCount || 0} memories</div>
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

      <div className="quick-links" style={{ marginTop: 32 }}>
        <Link href="/ops/missions" className="quick-link-card">📋 Missions</Link>
        <Link href="/ops/agents" className="quick-link-card">🤖 Agents</Link>
        <Link href="/projects" className="quick-link-card">🏢 Projects</Link>
        <Link href="/content" className="quick-link-card">🎬 Content</Link>
        <Link href="/revenue" className="quick-link-card">💰 Revenue</Link>
      </div>
    </div>
  );
}
