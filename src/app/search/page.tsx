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
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    setResults(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  // Ctrl+K focus
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
      regex.test(part) ? <mark key={i} style={{ background: '#7c3aed44', color: '#c4b5fd', borderRadius: 2 }}>{part}</mark> : part
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f4f4f5', marginBottom: '1.5rem' }}>🔍 Search</h1>
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <input id="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search everything... (Ctrl+K)" autoFocus
          style={{ width: '100%', padding: '0.85rem 1rem', background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: '#e4e4e7', fontSize: '1rem', outline: 'none' }} />
        {loading && <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: '0.8rem' }}>Searching...</span>}
      </div>

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            {items[0]?.icon} {type}s ({items.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map((r, i) => (
              <div key={i} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, padding: '0.85rem 1rem' }}>
                {r.path ? (
                  <Link href={`/documents?doc=${encodeURIComponent(r.path)}`} style={{ fontWeight: 600, color: '#c4b5fd', fontSize: '0.9rem', textDecoration: 'none' }}>{highlight(r.title)}</Link>
                ) : (
                  <span style={{ fontWeight: 600, color: '#e4e4e7', fontSize: '0.9rem' }}>{highlight(r.title)}</span>
                )}
                {r.path && <span style={{ fontSize: '0.7rem', color: '#52525b', marginLeft: '0.5rem' }}>{r.path}</span>}
                <p style={{ color: '#71717a', fontSize: '0.8rem', lineHeight: 1.4, marginTop: '0.25rem' }}>{highlight(r.snippet.slice(0, 200))}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {query && !loading && results.length === 0 && <p style={{ color: '#71717a', textAlign: 'center', marginTop: '2rem' }}>No results for &ldquo;{query}&rdquo;</p>}
      {!query && <p style={{ color: '#52525b', textAlign: 'center', marginTop: '3rem' }}>Start typing to search across all documents, tasks, and pins.</p>}
    </div>
  );
}
