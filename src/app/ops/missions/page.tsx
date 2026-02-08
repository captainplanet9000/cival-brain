'use client';

import { useEffect, useState } from 'react';

interface MissionStep { id: string; kind: string; status: string; payload: any; result: any; reserved_by: string; }
interface Mission { id: string; title: string; status: string; created_by: string; proposal_id: string; created_at: string; completed_at: string; ops_mission_steps: MissionStep[]; }

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCreator, setNewCreator] = useState('coordinator');

  useEffect(() => {
    fetch('/api/ops/missions').then(r => r.json()).then(d => Array.isArray(d) ? setMissions(d) : setMissions([]));
  }, []);

  const toggle = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  const createMission = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch('/api/ops/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, created_by: newCreator })
    });
    const m = await res.json();
    setMissions([m, ...missions]);
    setNewTitle('');
    setShowCreate(false);
  };

  const stepColor: Record<string, string> = { queued: 'var(--text-tertiary)', running: 'var(--amber)', done: 'var(--green)', failed: 'var(--rose)' };

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>📋 Missions</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>+ New Mission</button>
      </div>

      {showCreate && (
        <div className="ops-create-form" style={{ marginBottom: 24 }}>
          <input className="modal-input" placeholder="Mission title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="modal-select" value={newCreator} onChange={e => setNewCreator(e.target.value)}>
              <option value="coordinator">Coordinator</option>
              <option value="content-creator">Content Creator</option>
              <option value="observer">Observer</option>
            </select>
            <button className="btn-primary" onClick={createMission}>Create</button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {missions.map(m => (
          <div key={m.id} className="ops-mission-card" onClick={() => toggle(m.id)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {expanded.has(m.id) ? '▾' : '▸'} {m.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  by {m.created_by} · {new Date(m.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className={`badge ${m.status === 'approved' ? 'badge-areas' : m.status === 'completed' ? 'badge-journal' : 'badge-archive'}`}>
                {m.status}
              </span>
            </div>
            {expanded.has(m.id) && m.ops_mission_steps?.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                {m.ops_mission_steps.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: '0.84rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: stepColor[s.status] || 'var(--text-tertiary)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Step {i + 1}: {s.kind}</span>
                    <span className="badge badge-notes" style={{ marginLeft: 'auto' }}>{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {missions.length === 0 && <div className="empty-state"><p>No missions yet. Create one to get started.</p></div>}
      </div>
    </div>
  );
}
