'use client';
import { useEffect, useState } from 'react';

interface Campaign {
  id: string; name: string; description: string; status: string;
  start_date: string; end_date: string; budget: number;
  goals: Record<string, number>; tags: string[];
  business_unit_id: string | null;
  ops_business_units: { name: string } | null;
  created_at: string;
}

interface BU { id: string; name: string; }

const statusColors: Record<string, string> = {
  planning: 'var(--purple)', active: 'var(--green)', paused: 'var(--amber)', completed: 'var(--teal)', archived: 'var(--text-tertiary)',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [bus, setBus] = useState<BU[]>([]);
  const [filter, setFilter] = useState('');
  const [buFilter, setBuFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<Record<string, unknown[]>>({});
  const [form, setForm] = useState({ name: '', description: '', status: 'planning', business_unit_id: '', start_date: '', end_date: '', budget: 0 });

  const load = () => fetch('/api/marketing/campaigns').then(r => r.json()).then(d => setCampaigns(Array.isArray(d) ? d : []));
  useEffect(() => { load(); fetch('/api/ops/business-units').then(r => r.json()).then(d => setBus(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  const submit = async () => {
    const body = { ...form, business_unit_id: form.business_unit_id || null, budget: Number(form.budget) };
    await fetch('/api/marketing/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowForm(false);
    setForm({ name: '', description: '', status: 'planning', business_unit_id: '', start_date: '', end_date: '', budget: 0 });
    load();
  };

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!expandedContent[id]) {
      const res = await fetch(`/api/marketing/content?campaign_id=${id}`);
      const data = await res.json();
      setExpandedContent(prev => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
    }
  };

  const filtered = campaigns.filter(c => (!filter || c.status === filter) && (!buFilter || c.business_unit_id === buFilter));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>🎯 Campaigns</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Group content by campaign goals</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Campaign</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', 'planning', 'active', 'paused', 'completed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '4px 12px', borderRadius: 100, border: '1px solid var(--border-subtle)',
            background: filter === s ? 'var(--accent-subtle)' : 'var(--bg-surface)',
            color: filter === s ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
          }}>{s || 'All'}</button>
        ))}
        <select value={buFilter} onChange={e => setBuFilter(e.target.value)} style={{
          padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '0.78rem', fontFamily: 'inherit',
        }}>
          <option value="">All Units</option>
          {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Campaign Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {filtered.map(c => (
          <div key={c.id} onClick={() => toggleExpand(c.id)} style={{
            background: 'var(--bg-surface)', border: expanded === c.id ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', padding: 18, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{c.name}</span>
              <span style={{
                fontSize: '0.68rem', padding: '2px 10px', borderRadius: 100,
                background: `color-mix(in oklch, ${statusColors[c.status] || 'var(--accent)'} 20%, transparent)`,
                color: statusColors[c.status] || 'var(--accent)', textTransform: 'capitalize', fontWeight: 500,
              }}>{c.status}</span>
            </div>
            {c.description && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{c.description}</p>}
            <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {c.ops_business_units && <span>{c.ops_business_units.name}</span>}
              {c.start_date && <span>{c.start_date} → {c.end_date || '...'}</span>}
              {c.budget > 0 && <span>${c.budget}</span>}
            </div>
            {expanded === c.id && expandedContent[c.id] && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>CONTENT ({(expandedContent[c.id] as unknown[]).length})</div>
                {(expandedContent[c.id] as Array<{id: string; title: string; status: string; platform: string}>).map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: '0.82rem' }}>
                    <span>{{ tiktok: '🎵', twitter: '🐦', instagram: '📸', youtube: '🎬' }[item.platform] || '📱'}</span>
                    <span style={{ flex: 1 }}>{item.title}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{item.status}</span>
                  </div>
                ))}
                {(expandedContent[c.id] as unknown[]).length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>No content yet</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎯</div>
          <p>No campaigns yet. Create your first campaign!</p>
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 28, width: 480, maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 20 }}>New Campaign</h2>
            <label className="modal-label">Name</label>
            <input className="modal-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <label className="modal-label">Description</label>
            <textarea className="modal-textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="modal-label">Status</label>
                <select className="modal-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {['planning', 'active', 'paused', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
              <div><label className="modal-label">Business Unit</label>
                <select className="modal-select" value={form.business_unit_id} onChange={e => setForm({ ...form, business_unit_id: e.target.value })}>
                  <option value="">None</option>
                  {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="modal-label">Start Date</label><input className="modal-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><label className="modal-label">End Date</label><input className="modal-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <label className="modal-label">Budget ($)</label>
            <input className="modal-input" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit} disabled={!form.name}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
