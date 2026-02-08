'use client';
import { useEffect, useState } from 'react';

interface Item { type: string; title: string; preview: string; date: string; icon: string; }

const TYPES = ['all', 'commit', 'journal', 'task', 'doc', 'event'];

export default function Timeline() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const type = filter === 'all' ? '' : `&type=${filter}`;
    setLoading(true);

    const fetchLocal = fetch(`/api/timeline?limit=100${type}`).then(r => r.json());
    const fetchEvents = filter === 'all' || filter === 'event'
      ? fetch('/api/ops/events?limit=50').then(r => r.json()).catch(() => [])
      : Promise.resolve([]);

    Promise.all([fetchLocal, fetchEvents]).then(([local, events]) => {
      const all = [...(Array.isArray(local) ? local : [])];
      if (Array.isArray(events)) {
        events.forEach((e: any) => {
          all.push({
            type: 'event', title: e.title || e.kind || 'Agent Event',
            preview: e.summary || '', date: e.created_at, icon: '📡',
          });
        });
      }
      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(filter === 'all' ? all : all.filter(i => i.type === filter));
      setLoading(false);
    });
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
    <div className="page-container" style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20 }}>📊 Timeline</h1>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', cursor: 'pointer', textTransform: 'capitalize',
            background: filter === t ? 'var(--accent-subtle)' : 'var(--bg-surface)',
            color: filter === t ? 'var(--accent)' : 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}>{t}</button>
        ))}
      </div>

      {loading ? <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p> : Object.entries(grouped).map(([day, dayItems]) => (
        <div key={day} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>{day}</h2>
          <div style={{ borderLeft: '2px solid var(--border-subtle)', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayItems.map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-2.15rem', top: '1rem', width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{item.icon}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.title}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{fmtDate(item.date)}</span>
                </div>
                {item.preview && <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.4 }}>{item.preview.slice(0, 200)}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {!loading && items.length === 0 && <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 48 }}>No activity found.</p>}
    </div>
  );
}
