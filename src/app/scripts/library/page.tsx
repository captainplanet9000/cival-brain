'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Script {
  id: string;
  title: string;
  framework_id: string;
  category: string;
  series_name: string;
  episode_number: number;
  status: string;
  script_content: string;
  tts_content: string;
  music_prompt: string;
  video_prompt: string;
  visual_prompts: any[];
  word_count: number;
  estimated_duration_secs: number;
  tags: string[];
  created_at: string;
  script_frameworks: { name: string; slug: string; channel: string } | null;
}

interface Framework {
  id: string;
  name: string;
  slug: string;
  script_count: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'var(--purple-subtle)', text: 'var(--purple)' },
  review: { bg: 'var(--amber-subtle)', text: 'var(--amber)' },
  approved: { bg: 'var(--green-subtle)', text: 'var(--green)' },
  produced: { bg: 'var(--teal-subtle)', text: 'var(--teal)' },
  published: { bg: 'oklch(0.22 0.014 260)', text: 'var(--text-tertiary)' },
};

export default function ScriptLibrary() {
  return <Suspense fallback={<div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading...</div>}><ScriptLibraryInner /></Suspense>;
}

function ScriptLibraryInner() {
  const searchParams = useSearchParams();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Script | null>(null);
  const [search, setSearch] = useState('');
  const [filterFramework, setFilterFramework] = useState(searchParams.get('framework') || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [total, setTotal] = useState(0);

  const loadScripts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterCategory) params.set('category', filterCategory);
    params.set('limit', '100');

    // Framework filter needs ID lookup
    let url = `/api/scripts?${params}`;
    if (filterFramework) {
      const fw = frameworks.find(f => f.slug === filterFramework);
      if (fw) url += `&framework_id=${fw.id}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    setScripts(data.data || []);
    setTotal(data.count || 0);
  }, [search, filterFramework, filterStatus, filterCategory, frameworks]);

  useEffect(() => {
    fetch('/api/scripts/frameworks').then(r => r.json()).then(setFrameworks);
  }, []);

  useEffect(() => {
    if (frameworks.length > 0 || !filterFramework) {
      loadScripts().finally(() => setLoading(false));
    }
  }, [loadScripts, frameworks, filterFramework]);

  // Check if URL has specific script ID
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && scripts.length > 0) {
      const s = scripts.find(s => s.id === id);
      if (s) setSelected(s);
    }
  }, [searchParams, scripts]);

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/scripts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    loadScripts();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const categories = [...new Set(scripts.map(s => s.category).filter(Boolean))];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>📚 Script Library</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>{total} scripts</p>
        </div>
        <Link href="/scripts" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>← Dashboard</Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search scripts..."
          style={inputStyle}
        />
        <select value={filterFramework} onChange={e => setFilterFramework(e.target.value)} style={inputStyle}>
          <option value="">All Frameworks</option>
          {frameworks.map(f => <option key={f.id} value={f.slug}>{f.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="">All Statuses</option>
          {['draft', 'review', 'approved', 'produced', 'published'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={inputStyle}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Script List */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          {loading ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : scripts.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>No scripts found.</div>
          ) : scripts.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              style={{
                padding: '12px 16px',
                borderBottom: i < scripts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                cursor: 'pointer',
                background: selected?.id === s.id ? 'var(--accent-subtle)' : 'transparent',
              }}
            >
              <div style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 4 }}>{s.title}</div>
              <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text-tertiary)', alignItems: 'center' }}>
                {s.script_frameworks && <span>{s.script_frameworks.name}</span>}
                {s.category && <span>• {s.category}</span>}
                {s.series_name && <span>• {s.series_name} E{s.episode_number}</span>}
                <span>• {s.word_count}w</span>
                <StatusBadge status={s.status} />
              </div>
            </div>
          ))}
        </div>

        {/* Script Detail */}
        {selected && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'auto', maxHeight: 'calc(100vh - 200px)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{selected.title}</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selected.script_frameworks && <span>{selected.script_frameworks.name}</span>}
                  {selected.category && <span>• {selected.category}</span>}
                  {selected.series_name && <span>• {selected.series_name} Ep.{selected.episode_number}</span>}
                  <span>• {selected.word_count} words</span>
                  <span>• {selected.estimated_duration_secs}s</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {/* Status change */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['draft', 'review', 'approved', 'produced', 'published'].map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, s)} style={{
                  ...smallBtnStyle,
                  background: selected.status === s ? (STATUS_COLORS[s]?.bg || 'var(--bg-elevated)') : 'var(--bg-elevated)',
                  color: selected.status === s ? (STATUS_COLORS[s]?.text || 'var(--text-primary)') : 'var(--text-secondary)',
                  fontWeight: selected.status === s ? 600 : 400,
                }}>{s}</button>
              ))}
            </div>

            {/* Script Content */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Script</h3>
              <pre style={preStyle}>{selected.script_content}</pre>
            </div>

            {selected.tts_content && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>TTS Version</h3>
                <pre style={preStyle}>{selected.tts_content}</pre>
              </div>
            )}

            {selected.music_prompt && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>🎵 Music Prompt</h3>
                <pre style={{ ...preStyle, fontSize: '0.8rem' }}>{selected.music_prompt}</pre>
              </div>
            )}

            {selected.video_prompt && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>🎬 Video Prompt</h3>
                <pre style={{ ...preStyle, fontSize: '0.8rem' }}>{selected.video_prompt}</pre>
              </div>
            )}

            {selected.visual_prompts && selected.visual_prompts.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>🖼️ Visual Prompts</h3>
                {selected.visual_prompts.map((vp: any, i: number) => (
                  <pre key={i} style={{ ...preStyle, fontSize: '0.8rem', marginBottom: 6 }}>{typeof vp === 'string' ? vp : JSON.stringify(vp)}</pre>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontSize: '0.7rem', fontWeight: 600,
      padding: '1px 6px', borderRadius: 'var(--radius-sm)',
      textTransform: 'capitalize',
    }}>{status}</span>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  minWidth: 140,
};

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.75rem',
  border: '1px solid var(--border-subtle)',
  cursor: 'pointer',
};

const preStyle: React.CSSProperties = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: 14,
  fontSize: '0.82rem',
  fontFamily: 'var(--font-mono)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.6,
  color: 'var(--text-primary)',
  maxHeight: 400,
  overflow: 'auto',
};
