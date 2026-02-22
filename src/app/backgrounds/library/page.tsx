'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Prompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  subcategory: string;
  mood: string;
  status: string;
  usage_count: number;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  forests: 'oklch(0.65 0.15 145)', grasslands: 'oklch(0.7 0.15 130)', garden: 'oklch(0.65 0.12 155)',
  botanicals: 'oklch(0.6 0.13 160)', sky: 'oklch(0.7 0.12 230)', weather: 'oklch(0.55 0.1 250)',
  ocean: 'oklch(0.6 0.15 230)', water: 'oklch(0.6 0.12 220)', desert: 'oklch(0.7 0.12 70)',
  mountains: 'oklch(0.55 0.08 250)', night: 'oklch(0.45 0.12 280)', light: 'oklch(0.75 0.12 80)',
  macro: 'oklch(0.6 0.15 30)', autumn: 'oklch(0.65 0.15 50)', golden_hour: 'oklch(0.7 0.15 60)',
  coastal: 'oklch(0.6 0.1 200)', wetland: 'oklch(0.55 0.1 170)', underwater: 'oklch(0.5 0.15 240)',
  rain_lakes: 'oklch(0.55 0.1 220)',
};

const statusColors: Record<string, string> = {
  draft: 'oklch(0.5 0.03 250)', approved: 'oklch(0.65 0.15 145)', produced: 'oklch(0.65 0.15 250)', archived: 'oklch(0.4 0.02 250)',
};

const CATEGORIES = ['forests','grasslands','garden','botanicals','wetland','sky','weather','golden_hour','ocean','water','rain_lakes','underwater','coastal','desert','mountains','night','light','macro','autumn'];
const MOODS = ['calm','warm','contemplative','hopeful','serene','mysterious','energetic','melancholic','peaceful','dramatic','neutral'];
const STATUSES = ['draft','approved','produced','archived'];
const SORTS = [{ v: 'newest', l: 'Newest' }, { v: 'oldest', l: 'Oldest' }, { v: 'most_used', l: 'Most Used' }, { v: 'alpha', l: 'A-Z' }];

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'oklch(0.3 0.05 145)', color: 'white', padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 9999, animation: 'fadeIn 0.2s' }}>
      {message}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; placeholder: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: '8px 12px', background: 'oklch(0.2 0.01 250)', border: '1px solid oklch(0.3 0.02 250)', borderRadius: 8, color: 'oklch(0.85 0 0)', fontSize: 13, outline: 'none', cursor: 'pointer', minWidth: 100 }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

export default function LibraryPageWrapper() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: 'oklch(0.13 0.01 250)', color: 'oklch(0.5 0 0)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>}><LibraryPage /></Suspense>;
}

function LibraryPage() {
  const searchParams = useSearchParams();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [mood, setMood] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (mood) params.set('mood', mood);
    if (status) params.set('status', status);
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '50');
    const res = await fetch(`/api/backgrounds?${params}`);
    const d = await res.json();
    setPrompts(d.data || []);
    setCount(d.count || 0);
    setTotalPages(d.totalPages || 1);
    setLoading(false);
  }, [search, category, mood, status, sort, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const debouncedSearch = (v: string) => {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); }, 300);
  };

  const copyPrompt = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setToast('Copied to clipboard!');
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch('/api/backgrounds', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) });
    fetchData();
    setToast(`Status → ${newStatus}`);
  };

  const saveEdit = async (id: string) => {
    await fetch('/api/backgrounds', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, prompt: editText }) });
    setEditing(null);
    fetchData();
    setToast('Saved!');
  };

  const deletePrompt = async (id: string) => {
    await fetch(`/api/backgrounds?id=${id}`, { method: 'DELETE' });
    fetchData();
    setToast('Deleted');
  };

  const bulkAction = async (action: string) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (action === 'delete') {
      await fetch('/api/backgrounds', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    } else {
      await fetch('/api/backgrounds', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status: action }) });
    }
    setSelected(new Set());
    fetchData();
    setToast(`${action === 'delete' ? 'Deleted' : 'Updated'} ${ids.length} prompts`);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === prompts.length) setSelected(new Set());
    else setSelected(new Set(prompts.map(p => p.id)));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'oklch(0.13 0.01 250)', color: 'oklch(0.92 0 0)', padding: '20px' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .card:hover { border-color: oklch(0.35 0.04 250) !important; }
      `}</style>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/backgrounds" style={{ color: 'oklch(0.6 0 0)', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Prompt Library</h1>
            <span style={{ fontSize: 13, color: 'oklch(0.5 0 0)', background: 'oklch(0.2 0.01 250)', padding: '3px 10px', borderRadius: 6 }}>{count} prompts</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['grid', 'list'].map(v => (
              <button key={v} onClick={() => setView(v as 'grid' | 'list')}
                style={{ padding: '6px 14px', background: view === v ? 'oklch(0.3 0.04 250)' : 'transparent', border: '1px solid oklch(0.3 0.02 250)', borderRadius: 6, color: 'oklch(0.8 0 0)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {v === 'grid' ? '▦ Grid' : '☰ List'}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Bar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <input ref={searchRef} value={search} onChange={e => debouncedSearch(e.target.value)} placeholder="Search prompts..."
            style={{ flex: 1, minWidth: 200, padding: '9px 14px', background: 'oklch(0.17 0.01 250)', border: '1px solid oklch(0.28 0.02 250)', borderRadius: 8, color: 'oklch(0.9 0 0)', fontSize: 14, outline: 'none' }} />
          <Select value={category} onChange={v => { setCategory(v); setPage(1); }} options={CATEGORIES.map(c => ({ v: c, l: c.replace(/_/g, ' ') }))} placeholder="All Categories" />
          <Select value={mood} onChange={v => { setMood(v); setPage(1); }} options={MOODS.map(m => ({ v: m, l: m }))} placeholder="All Moods" />
          <Select value={status} onChange={v => { setStatus(v); setPage(1); }} options={STATUSES.map(s => ({ v: s, l: s }))} placeholder="All Status" />
          <Select value={sort} onChange={setSort} options={SORTS} placeholder="Sort" />
          {(search || category || mood || status) && (
            <button onClick={() => { setSearch(''); setCategory(''); setMood(''); setStatus(''); setPage(1); }}
              style={{ padding: '8px 12px', background: 'oklch(0.25 0.05 0)', border: 'none', borderRadius: 6, color: 'oklch(0.8 0 0)', cursor: 'pointer', fontSize: 12 }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: '10px 16px', background: 'oklch(0.2 0.03 250)', borderRadius: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
            <button onClick={() => bulkAction('approved')} style={{ padding: '5px 12px', background: 'oklch(0.3 0.1 145)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 12 }}>✓ Approve</button>
            <button onClick={() => bulkAction('produced')} style={{ padding: '5px 12px', background: 'oklch(0.3 0.1 250)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 12 }}>🎬 Produced</button>
            <button onClick={() => bulkAction('delete')} style={{ padding: '5px 12px', background: 'oklch(0.3 0.1 20)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 12 }}>🗑 Delete</button>
            <button onClick={() => setSelected(new Set())} style={{ padding: '5px 12px', background: 'none', border: '1px solid oklch(0.3 0 0)', borderRadius: 6, color: 'oklch(0.7 0 0)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'oklch(0.5 0 0)' }}>Loading...</div>}

        {/* Grid View */}
        {!loading && view === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {prompts.map(p => {
              const isExpanded = expanded === p.id;
              const isEditing = editing === p.id;
              return (
                <div key={p.id} className="card" style={{
                  background: 'oklch(0.17 0.01 250)', borderRadius: 10, padding: 16,
                  border: `1px solid ${selected.has(p.id) ? 'oklch(0.65 0.15 250)' : 'oklch(0.22 0.02 250)'}`,
                  transition: 'all 0.15s', animation: 'fadeIn 0.2s',
                  opacity: p.status === 'archived' ? 0.5 : 1,
                }}>
                  {/* Top row: checkbox + badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                        style={{ accentColor: 'oklch(0.65 0.15 250)', cursor: 'pointer' }} />
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: categoryColors[p.category] || 'oklch(0.3 0.05 250)', color: 'white', fontWeight: 600 }}>
                        {p.category}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'oklch(0.22 0.02 250)', color: 'oklch(0.65 0 0)' }}>{p.mood}</span>
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: statusColors[p.status] || 'oklch(0.3 0 0)', color: 'white', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {p.status}
                    </span>
                  </div>

                  {/* Title */}
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{p.title}</div>

                  {/* Prompt text */}
                  {isEditing ? (
                    <div>
                      <textarea value={editText} onChange={e => setEditText(e.target.value)}
                        style={{ width: '100%', minHeight: 120, padding: 10, background: 'oklch(0.14 0.01 250)', border: '1px solid oklch(0.35 0.05 250)', borderRadius: 6, color: 'oklch(0.9 0 0)', fontSize: 12, lineHeight: 1.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button onClick={() => saveEdit(p.id)} style={{ padding: '5px 14px', background: 'oklch(0.4 0.12 145)', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: 12 }}>Save</button>
                        <button onClick={() => setEditing(null)} style={{ padding: '5px 14px', background: 'oklch(0.25 0.02 250)', border: 'none', borderRadius: 5, color: 'oklch(0.7 0 0)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => setExpanded(isExpanded ? null : p.id)} style={{ cursor: 'pointer' }}>
                      <div style={{
                        fontSize: 12, color: 'oklch(0.65 0 0)', lineHeight: 1.5, marginBottom: 10,
                        ...(isExpanded ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
                      }}>
                        {p.prompt}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* COPY BUTTON - prominent */}
                      <button onClick={() => copyPrompt(p.prompt)}
                        style={{ padding: '6px 16px', background: 'oklch(0.65 0.15 250)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        📋 Copy
                      </button>
                      <button onClick={() => { setEditing(p.id); setEditText(p.prompt); }}
                        style={{ padding: '5px 10px', background: 'oklch(0.22 0.02 250)', border: 'none', borderRadius: 5, color: 'oklch(0.65 0 0)', cursor: 'pointer', fontSize: 11 }}>
                        ✏️ Edit
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'oklch(0.45 0 0)' }}>used {p.usage_count}×</span>
                      {p.status === 'draft' && (
                        <button onClick={() => updateStatus(p.id, 'approved')}
                          style={{ padding: '3px 8px', background: 'none', border: '1px solid oklch(0.35 0.08 145)', borderRadius: 4, color: 'oklch(0.6 0.1 145)', cursor: 'pointer', fontSize: 10 }}>
                          ✓
                        </button>
                      )}
                      {p.status === 'approved' && (
                        <button onClick={() => updateStatus(p.id, 'produced')}
                          style={{ padding: '3px 8px', background: 'none', border: '1px solid oklch(0.35 0.08 250)', borderRadius: 4, color: 'oklch(0.6 0.1 250)', cursor: 'pointer', fontSize: 10 }}>
                          🎬
                        </button>
                      )}
                      <button onClick={() => deletePrompt(p.id)}
                        style={{ padding: '3px 8px', background: 'none', border: '1px solid oklch(0.3 0.05 20)', borderRadius: 4, color: 'oklch(0.5 0.08 20)', cursor: 'pointer', fontSize: 10 }}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {!loading && view === 'list' && (
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid oklch(0.22 0.02 250)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '30px 100px 1fr 80px 2fr 70px 80px', padding: '10px 14px', background: 'oklch(0.2 0.01 250)', fontSize: 11, fontWeight: 700, color: 'oklch(0.55 0 0)', textTransform: 'uppercase', letterSpacing: 0.5, gap: 8 }}>
              <div><input type="checkbox" onChange={selectAll} checked={selected.size === prompts.length && prompts.length > 0} style={{ accentColor: 'oklch(0.65 0.15 250)' }} /></div>
              <div>Category</div><div>Title</div><div>Mood</div><div>Prompt</div><div>Copy</div><div>Status</div>
            </div>
            {prompts.map(p => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '30px 100px 1fr 80px 2fr 70px 80px', padding: '8px 14px', background: 'oklch(0.17 0.01 250)', borderTop: '1px solid oklch(0.2 0.01 250)', fontSize: 12, alignItems: 'center', gap: 8 }}>
                <div><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} style={{ accentColor: 'oklch(0.65 0.15 250)' }} /></div>
                <div><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: categoryColors[p.category] || 'oklch(0.3 0 0)', color: 'white', fontWeight: 600 }}>{p.category}</span></div>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                <div style={{ color: 'oklch(0.6 0 0)' }}>{p.mood}</div>
                <div style={{ color: 'oklch(0.6 0 0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.prompt.slice(0, 100)}...</div>
                <div>
                  <button onClick={() => copyPrompt(p.prompt)}
                    style={{ padding: '4px 12px', background: 'oklch(0.65 0.15 250)', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                    📋
                  </button>
                </div>
                <div><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: statusColors[p.status], color: 'white', fontWeight: 600, textTransform: 'uppercase' }}>{p.status}</span></div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24, alignItems: 'center' }}>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              style={{ padding: '8px 14px', background: 'oklch(0.2 0.01 250)', border: '1px solid oklch(0.3 0.02 250)', borderRadius: 6, color: page === 1 ? 'oklch(0.35 0 0)' : 'oklch(0.8 0 0)', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13 }}>
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) pageNum = i + 1;
              else if (page <= 4) pageNum = i + 1;
              else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
              else pageNum = page - 3 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  style={{ padding: '8px 12px', background: page === pageNum ? 'oklch(0.65 0.15 250)' : 'oklch(0.2 0.01 250)', border: '1px solid oklch(0.3 0.02 250)', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: page === pageNum ? 700 : 400, minWidth: 38 }}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
              style={{ padding: '8px 14px', background: 'oklch(0.2 0.01 250)', border: '1px solid oklch(0.3 0.02 250)', borderRadius: 6, color: page === totalPages ? 'oklch(0.35 0 0)' : 'oklch(0.8 0 0)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13 }}>
              Next →
            </button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
