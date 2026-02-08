'use client';

import { useEffect, useState } from 'react';

const STAGES = ['idea', 'script', 'render', 'edit', 'schedule', 'published'];
const stageColors: Record<string, string> = {
  idea: 'var(--purple)', script: 'var(--accent)', render: 'var(--amber)',
  edit: 'var(--teal)', schedule: 'var(--green)', published: 'var(--text-tertiary)'
};

interface ContentItem {
  id: string; title: string; stage: string; channel: string;
  business_unit_id: string; metadata: any; created_at: string;
  ops_business_units?: { name: string; icon: string; slug: string };
}
interface BusinessUnit { id: string; name: string; slug: string; icon: string; }

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [filterChannel, setFilterChannel] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [newUnitId, setNewUnitId] = useState('');

  const load = () => {
    let url = '/api/ops/content-pipeline?';
    if (filterChannel) url += `channel=${filterChannel}&`;
    if (filterUnit) url += `business_unit_id=${filterUnit}&`;
    fetch(url).then(r => r.json()).then(d => Array.isArray(d) ? setItems(d) : []);
  };

  useEffect(() => {
    load();
    fetch('/api/ops/business-units').then(r => r.json()).then(d => Array.isArray(d) ? setUnits(d) : []);
  }, [filterChannel, filterUnit]);

  const create = async () => {
    if (!newTitle.trim()) return;
    await fetch('/api/ops/content-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, channel: newChannel, business_unit_id: newUnitId || null })
    });
    setNewTitle(''); setNewChannel(''); setShowCreate(false);
    load();
  };

  const moveStage = async (id: string, stage: string) => {
    await fetch('/api/ops/content-pipeline', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stage })
    });
    load();
  };

  const getByStage = (stage: string) => items.filter(i => i.stage === stage);
  const channels = [...new Set(items.map(i => i.channel).filter(Boolean))];

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>🎬 Content Pipeline</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="modal-select" style={{ width: 'auto' }} value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
            <option value="">All Channels</option>
            {channels.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="modal-select" style={{ width: 'auto' }} value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
            <option value="">All Units</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>+ New</button>
        </div>
      </div>

      {showCreate && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 20 }}>
          <input className="modal-input" placeholder="Content title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="modal-input" placeholder="Channel (e.g. TikTok)" value={newChannel} onChange={e => setNewChannel(e.target.value)} />
            <select className="modal-select" value={newUnitId} onChange={e => setNewUnitId(e.target.value)}>
              <option value="">No unit</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
            </select>
            <button className="btn-primary" onClick={create}>Create</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: 12, minHeight: 'calc(100vh - 180px)' }}>
        {STAGES.map(stage => (
          <div key={stage} className="kanban-column">
            <div className="kanban-col-header">
              <div className="kanban-col-dot" style={{ background: stageColors[stage] }} />
              <span className="kanban-col-title" style={{ textTransform: 'capitalize' }}>{stage}</span>
              <span className="kanban-col-count">{getByStage(stage).length}</span>
            </div>
            <div className="kanban-col-body">
              {getByStage(stage).map(item => (
                <div key={item.id} className="kanban-card">
                  <div className="kanban-card-title">{item.title}</div>
                  {item.ops_business_units && (
                    <div className="kanban-card-desc">{item.ops_business_units.icon} {item.ops_business_units.name}</div>
                  )}
                  {item.channel && <div className="kanban-tag" style={{ marginTop: 6 }}>{item.channel}</div>}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {STAGES.indexOf(stage) > 0 && (
                      <button className="btn-small" style={{ fontSize: '0.72rem' }} onClick={() => moveStage(item.id, STAGES[STAGES.indexOf(stage) - 1])}>← Back</button>
                    )}
                    {STAGES.indexOf(stage) < STAGES.length - 1 && (
                      <button className="btn-small" style={{ fontSize: '0.72rem', marginLeft: 'auto' }} onClick={() => moveStage(item.id, STAGES[STAGES.indexOf(stage) + 1])}>Next →</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
