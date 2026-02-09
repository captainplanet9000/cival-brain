'use client';
import { useEffect, useState, useCallback } from 'react';

interface ContentItem {
  id: string; title: string; description: string; content_type: string; platform: string;
  status: string; business_unit_id: string | null; campaign_id: string | null;
  script: string; caption: string; hashtags: string[]; scheduled_for: string | null;
  ops_business_units: { name: string } | null; marketing_campaigns: { name: string } | null;
  created_at: string;
}
interface BU { id: string; name: string; }
interface Campaign { id: string; name: string; }

const stages = ['idea', 'scripted', 'producing', 'review', 'scheduled', 'published'];
const stageLabels: Record<string, string> = { idea: '💡 Idea', scripted: '📝 Scripted', producing: '🎥 Producing', review: '👀 Review', scheduled: '📅 Scheduled', published: '✅ Published' };
const stageColors: Record<string, string> = { idea: 'var(--purple)', scripted: 'var(--accent)', producing: 'var(--amber)', review: 'var(--teal)', scheduled: 'var(--green)', published: 'var(--text-tertiary)' };
const platformIcons: Record<string, string> = { tiktok: '🎵', twitter: '🐦', instagram: '📸', youtube: '🎬', facebook: '📘', linkedin: '💼' };

export default function ContentPipeline() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [bus, setBus] = useState<BU[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [platFilter, setPlatFilter] = useState('');
  const [buFilter, setBuFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    title: '', description: '', platform: 'tiktok', content_type: 'tiktok', status: 'idea',
    business_unit_id: '', campaign_id: '', script: '', caption: '', hashtags: '',
  });

  const load = useCallback(() => {
    fetch('/api/marketing/content').then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    load();
    fetch('/api/ops/business-units').then(r => r.json()).then(d => setBus(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/marketing/campaigns').then(r => r.json()).then(d => setCampaigns(Array.isArray(d) ? d : [])).catch(() => {});
  }, [load]);

  const moveItem = async (id: string, newStatus: string) => {
    await fetch('/api/marketing/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) });
    load();
  };

  const bulkMove = async (newStatus: string) => {
    await Promise.all([...selected].map(id => fetch('/api/marketing/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) })));
    setSelected(new Set());
    load();
  };

  const submit = async () => {
    const body = {
      ...form,
      business_unit_id: form.business_unit_id || null,
      campaign_id: form.campaign_id || null,
      hashtags: form.hashtags ? form.hashtags.split(',').map(h => h.trim()) : [],
    };
    await fetch('/api/marketing/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowForm(false);
    setForm({ title: '', description: '', platform: 'tiktok', content_type: 'tiktok', status: 'idea', business_unit_id: '', campaign_id: '', script: '', caption: '', hashtags: '' });
    load();
  };

  const filtered = items.filter(i => (!platFilter || i.platform === platFilter) && (!buFilter || i.business_unit_id === buFilter));

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>📝 Content Pipeline</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected.size > 0 && (
            <select onChange={e => { if (e.target.value) bulkMove(e.target.value); e.target.value = ''; }} style={{
              padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--amber)',
              background: 'var(--amber-subtle)', color: 'var(--amber)', fontSize: '0.82rem', fontFamily: 'inherit',
            }}>
              <option value="">Move {selected.size} items →</option>
              {stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}
            </select>
          )}
          <button onClick={() => setShowForm(true)} className="btn-primary">+ New Content</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'tiktok', 'twitter', 'instagram', 'youtube'].map(p => (
          <button key={p} onClick={() => setPlatFilter(p)} style={{
            padding: '4px 10px', borderRadius: 100, border: '1px solid var(--border-subtle)',
            background: platFilter === p ? 'var(--accent-subtle)' : 'transparent',
            color: platFilter === p ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
          }}>{p ? `${platformIcons[p]} ${p}` : 'All'}</button>
        ))}
        <select value={buFilter} onChange={e => setBuFilter(e.target.value)} style={{
          padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '0.78rem', fontFamily: 'inherit',
        }}>
          <option value="">All Units</option>
          {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(200px, 1fr))`, gap: 10, overflowX: 'auto' }}>
        {stages.map(stage => {
          const stageItems = filtered.filter(i => i.status === stage);
          const idx = stages.indexOf(stage);
          return (
            <div key={stage} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', minHeight: 300,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stageColors[stage] }} />
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{stageLabels[stage]}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '1px 7px', borderRadius: 100 }}>{stageItems.length}</span>
              </div>
              <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {stageItems.map(item => (
                  <div key={item.id} style={{
                    background: selected.has(item.id) ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                    border: selected.has(item.id) ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)', padding: 10, cursor: 'pointer',
                  }} onClick={() => {
                    const s = new Set(selected);
                    if (s.has(item.id)) s.delete(item.id); else s.add(item.id);
                    setSelected(s);
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.85rem' }}>{platformIcons[item.platform] || '📱'}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                    </div>
                    {item.ops_business_units && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{item.ops_business_units.name}</div>
                    )}
                    {item.scheduled_for && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--green)' }}>📅 {new Date(item.scheduled_for).toLocaleDateString()}</div>
                    )}
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {idx > 0 && <button onClick={e => { e.stopPropagation(); moveItem(item.id, stages[idx - 1]); }} style={{
                        flex: 1, padding: '2px 6px', fontSize: '0.68rem', borderRadius: 4,
                        border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-tertiary)',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>← Back</button>}
                      {idx < stages.length - 1 && <button onClick={e => { e.stopPropagation(); moveItem(item.id, stages[idx + 1]); }} style={{
                        flex: 1, padding: '2px 6px', fontSize: '0.68rem', borderRadius: 4,
                        border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--accent)',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>Next →</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 28, width: 560, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>New Content</h2>
            <label className="modal-label">Title</label>
            <input className="modal-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <label className="modal-label">Description</label>
            <textarea className="modal-textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="modal-label">Platform</label>
                <select className="modal-select" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                  {['tiktok', 'twitter', 'instagram', 'youtube', 'facebook', 'linkedin'].map(p => <option key={p} value={p}>{platformIcons[p]} {p}</option>)}
                </select></div>
              <div><label className="modal-label">Content Type</label>
                <select className="modal-select" value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}>
                  {['tiktok', 'tweet', 'instagram', 'youtube', 'ad', 'blog'].map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="modal-label">Business Unit</label>
                <select className="modal-select" value={form.business_unit_id} onChange={e => setForm({ ...form, business_unit_id: e.target.value })}>
                  <option value="">None</option>
                  {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select></div>
              <div><label className="modal-label">Campaign</label>
                <select className="modal-select" value={form.campaign_id} onChange={e => setForm({ ...form, campaign_id: e.target.value })}>
                  <option value="">None</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
            </div>
            <label className="modal-label">Script</label>
            <textarea className="modal-textarea" rows={4} value={form.script} onChange={e => setForm({ ...form, script: e.target.value })} />
            <label className="modal-label">Caption</label>
            <textarea className="modal-textarea" rows={2} value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} />
            <label className="modal-label">Hashtags (comma separated)</label>
            <input className="modal-input" value={form.hashtags} onChange={e => setForm({ ...form, hashtags: e.target.value })} placeholder="#viral, #fyp" />
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit} disabled={!form.title}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
