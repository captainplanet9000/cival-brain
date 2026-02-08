'use client';
import { useEffect, useState } from 'react';

interface Pin { id: string; content: string; color: string; tags: string[]; pinned: boolean; archived: boolean; createdAt: string; }

const COLORS = ['yellow', 'blue', 'green', 'pink', 'purple'];
const COLOR_MAP: Record<string, { bg: string; border: string }> = {
  yellow: { bg: '#422006', border: '#a16207' },
  blue: { bg: '#0c1a3d', border: '#2563eb' },
  green: { bg: '#052e16', border: '#16a34a' },
  pink: { bg: '#3b0a2a', border: '#db2777' },
  purple: { bg: '#1e0a3e', border: '#7c3aed' },
};

export default function Pinboard() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editPin, setEditPin] = useState<Pin | null>(null);
  const [form, setForm] = useState({ content: '', color: 'yellow', tags: '', pinned: false });
  const [filter, setFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const load = () => fetch('/api/pins').then(r => r.json()).then(setPins);
  useEffect(() => { load(); }, []);

  const allTags = [...new Set(pins.flatMap(p => p.tags))];
  const filtered = pins
    .filter(p => showArchived ? p.archived : !p.archived)
    .filter(p => !filter || p.tags.includes(filter))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const save = async () => {
    const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    if (editPin) {
      await fetch('/api/pins', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id: editPin.id }) });
    } else {
      await fetch('/api/pins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setShowModal(false); setEditPin(null); setForm({ content: '', color: 'yellow', tags: '', pinned: false }); load();
  };

  const togglePin = async (p: Pin) => {
    await fetch('/api/pins', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, pinned: !p.pinned }) });
    load();
  };

  const archive = async (p: Pin) => {
    await fetch('/api/pins', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, archived: !p.archived }) });
    load();
  };

  const del = async (id: string) => { await fetch(`/api/pins?id=${id}`, { method: 'DELETE' }); load(); };

  const openEdit = (p: Pin) => {
    setEditPin(p); setForm({ content: p.content, color: p.color, tags: p.tags.join(', '), pinned: p.pinned }); setShowModal(true);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f4f4f5' }}>📌 Pinboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowArchived(!showArchived)} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: showArchived ? '#3f3f46' : '#27272a', color: '#a1a1aa', border: '1px solid #3f3f46', cursor: 'pointer', fontSize: '0.85rem' }}>
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
          <button onClick={() => { setEditPin(null); setForm({ content: '', color: 'yellow', tags: '', pinned: false }); setShowModal(true); }} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            + New Pin
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('')} style={{ padding: '0.25rem 0.75rem', borderRadius: 20, background: !filter ? '#7c3aed' : '#27272a', color: !filter ? '#fff' : '#a1a1aa', border: '1px solid #3f3f46', cursor: 'pointer', fontSize: '0.8rem' }}>All</button>
          {allTags.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: '0.25rem 0.75rem', borderRadius: 20, background: filter === t ? '#7c3aed' : '#27272a', color: filter === t ? '#fff' : '#a1a1aa', border: '1px solid #3f3f46', cursor: 'pointer', fontSize: '0.8rem' }}>{t}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filtered.map(p => {
          const c = COLOR_MAP[p.color] || COLOR_MAP.yellow;
          return (
            <div key={p.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '1rem', position: 'relative', cursor: 'pointer' }} onClick={() => openEdit(p)}>
              {p.pinned && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.8rem' }}>📍</span>}
              <p style={{ color: '#e4e4e7', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>{p.content}</p>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {p.tags.map(t => <span key={t} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.5rem', borderRadius: 10, fontSize: '0.7rem', color: '#a1a1aa' }}>{t}</span>)}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                <button onClick={e => { e.stopPropagation(); togglePin(p); }} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>{p.pinned ? 'Unpin' : 'Pin'}</button>
                <button onClick={e => { e.stopPropagation(); archive(p); }} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>{p.archived ? 'Restore' : 'Archive'}</button>
                <button onClick={e => { e.stopPropagation(); del(p.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#71717a', marginTop: '3rem' }}>No pins yet. Capture an idea!</p>}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 16, padding: '1.5rem', width: 420, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f4f4f5', marginBottom: '1rem' }}>{editPin ? 'Edit Pin' : 'New Pin'}</h2>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="What's on your mind?" rows={4} style={{ width: '100%', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, padding: '0.75rem', color: '#e4e4e7', fontSize: '0.9rem', resize: 'vertical', marginBottom: '0.75rem' }} />
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} style={{ width: 32, height: 32, borderRadius: '50%', background: COLOR_MAP[c].bg, border: form.color === c ? `2px solid ${COLOR_MAP[c].border}` : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" style={{ width: '100%', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, padding: '0.6rem', color: '#e4e4e7', fontSize: '0.85rem', marginBottom: '0.75rem' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} /> Pin to top
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#27272a', color: '#a1a1aa', border: '1px solid #3f3f46', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
