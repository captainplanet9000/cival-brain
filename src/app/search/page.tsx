'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Result { type: string; title: string; snippet: string; path?: string; icon: string; }

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const [localRes, opsRes] = await Promise.all([
      fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
      fetch('/api/openclaw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', params: { query: q } }),
      }).then(r => r.json()).catch(() => ({ results: [] })),
    ]);
    const all: Result[] = [...(Array.isArray(localRes) ? localRes : []), ...(opsRes.results || [])];
    setResults(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('search-input')?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const grouped: Record<string, Result[]> = {};
  results.forEach(r => { if (!grouped[r.type]) grouped[r.type] = []; grouped[r.type].push(r); });

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', borderRadius: 2 }}>{part}</mark> : part
    );
  };

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20 }}>🔍 Search</h1>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <input id="search-input" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search everything... documents, tasks, agents, missions, content (Ctrl+K)" autoFocus
          className="modal-input" style={{ fontSize: '1rem', padding: '12px 16px' }} />
        {loading && <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Searching...</span>}
      </div>

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            {items[0]?.icon} {type}s ({items.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((r, i) => (
              <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                {r.path ? (
                  <Link href={`/documents?doc=${encodeURIComponent(r.path)}`} style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '0.9rem', textDecoration: 'none' }}>{highlight(r.title)}</Link>
                ) : (
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{highlight(r.title)}</span>
                )}
                {r.path && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: 8 }}>{r.path}</span>}
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.4, marginTop: 4 }}>{highlight(r.snippet.slice(0, 200))}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {query && !loading && results.length === 0 && <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 32 }}>No results for &ldquo;{query}&rdquo;</p>}
      {!query && <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 48 }}>Search across documents, tasks, pins, agents, missions, content, and revenue.</p>}
    </div>
  );
}
