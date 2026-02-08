'use client';
import { useEffect, useState } from 'react';

interface Digest { name: string; path: string; content: string; modified: string; }

export default function Digests() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [selected, setSelected] = useState<Digest | null>(null);
  const [week, setWeek] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const wk = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-${String(wk).padStart(2, '0')}`;
  });
  const [generating, setGenerating] = useState(false);

  const load = () => fetch('/api/digests').then(r => r.json()).then(d => { if (Array.isArray(d)) setDigests(d); });
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    const res = await fetch('/api/digests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week }) });
    const data = await res.json();
    if (data.content) { setSelected(data); load(); }
    setGenerating(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f4f4f5', marginBottom: '1.5rem' }}>📰 Weekly Digests</h1>

      <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: '1.25rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#e4e4e7', marginBottom: '0.75rem' }}>Generate Digest</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Week (YYYY-WW):</label>
          <input value={week} onChange={e => setWeek(e.target.value)} placeholder="2026-05"
            style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#e4e4e7', fontSize: '0.9rem', width: 140 }} />
          <button onClick={generate} disabled={generating}
            style={{ padding: '0.5rem 1.25rem', borderRadius: 8, background: generating ? '#52525b' : '#7c3aed', color: '#fff', border: 'none', cursor: generating ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', minHeight: 400 }}>
        <div>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Past Digests</h3>
          {digests.length === 0 && <p style={{ color: '#52525b', fontSize: '0.85rem' }}>No digests yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {digests.map(d => (
              <button key={d.name} onClick={() => setSelected(d)}
                style={{ textAlign: 'left', padding: '0.6rem 0.85rem', borderRadius: 8, background: selected?.name === d.name ? '#7c3aed22' : '#18181b', border: selected?.name === d.name ? '1px solid #7c3aed' : '1px solid #27272a', color: '#e4e4e7', cursor: 'pointer', fontSize: '0.85rem' }}>
                📰 {d.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: '1.5rem', overflow: 'auto' }}>
          {selected ? (
            <div style={{ color: '#d4d4d8', fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {selected.content.split('\n').map((line, i) => {
                if (line.startsWith('# ')) return <h1 key={i} style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f4f4f5', marginBottom: '0.5rem' }}>{line.slice(2)}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '1.1rem', fontWeight: 600, color: '#c4b5fd', marginTop: '1rem', marginBottom: '0.35rem' }}>{line.slice(3)}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e4e4e7', marginTop: '0.75rem' }}>{line.slice(4)}</h3>;
                if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: '1rem', color: '#a1a1aa' }}>• {line.slice(2)}</div>;
                if (line.startsWith('**')) return <div key={i} style={{ fontWeight: 600 }}>{line.replace(/\*\*/g, '')}</div>;
                return <div key={i}>{line || '\u00A0'}</div>;
              })}
            </div>
          ) : (
            <p style={{ color: '#52525b', textAlign: 'center', marginTop: '3rem' }}>Select or generate a digest to view.</p>
          )}
        </div>
      </div>
    </div>
  );
}
