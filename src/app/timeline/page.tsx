'use client';
import { useEffect, useState } from 'react';

interface Item { type: string; title: string; preview: string; date: string; icon: string; }

const TYPES = ['all', 'commit', 'journal', 'task', 'doc'];

export default function Timeline() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const type = filter === 'all' ? '' : `&type=${filter}`;
    setLoading(true);
    fetch(`/api/timeline?limit=100${type}`).then(r => r.json()).then(d => { setItems(d); setLoading(false); });
  }, [filter]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const grouped: Record<string, Item[]> = {};
  items.forEach(i => {
    const day = new Date(i.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(i);
  });

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f4f4f5', marginBottom: '1.5rem' }}>📊 Timeline</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ padding: '0.35rem 0.9rem', borderRadius: 20, background: filter === t ? '#7c3aed' : '#27272a', color: filter === t ? '#fff' : '#a1a1aa', border: '1px solid #3f3f46', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {loading ? <p style={{ color: '#71717a' }}>Loading...</p> : Object.entries(grouped).map(([day, dayItems]) => (
        <div key={day} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', borderBottom: '1px solid #27272a', paddingBottom: '0.5rem' }}>{day}</h2>
          <div style={{ borderLeft: '2px solid #27272a', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {dayItems.map((item, i) => (
              <div key={i} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, padding: '0.85rem 1rem', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-2.15rem', top: '1rem', width: 24, height: 24, borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{item.icon}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: '#e4e4e7', fontSize: '0.9rem' }}>{item.title}</span>
                  <span style={{ fontSize: '0.7rem', color: '#52525b', whiteSpace: 'nowrap', marginLeft: '1rem' }}>{fmtDate(item.date)}</span>
                </div>
                {item.preview && <p style={{ color: '#71717a', fontSize: '0.8rem', lineHeight: 1.4 }}>{item.preview.slice(0, 200)}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {!loading && items.length === 0 && <p style={{ color: '#71717a', textAlign: 'center', marginTop: '3rem' }}>No activity found.</p>}
    </div>
  );
}
