'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface BgPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  subcategory: string | null;
  mood: string;
  style: string;
  color_palette: string | null;
  motion_type: string;
  format: string;
  loop_friendly: boolean;
  caption_safe: boolean;
  platform: string;
  tags: string[];
  status: string;
  usage_count: number;
  last_used_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const MOOD_COLORS: Record<string, string> = {
  empowering: 'var(--amber)', reflective: 'var(--purple)', calming: 'var(--teal)',
  intense: '#ef4444', hopeful: 'var(--green)', melancholic: '#6b7280',
  triumphant: 'var(--amber)', ethereal: '#a78bfa',
};

const CATEGORY_ICONS: Record<string, string> = {
  self_belief: '💪', performance: '🏆', mental_clarity: '🧘', pre_interview: '👔', pre_test: '📝',
  rock_bottom_recovery: '🌅', chronic_illness: '💜', caregiver_burnout: '🤲', parenting_anxiety: '👶',
  sobriety_identity: '🌿', neurodivergent_identity: '🧩', body_image: '🪞', grief_loss: '🕊️',
  financial_healing: '🌱', career_reinvention: '🦋', relationship_healing: '💛', loneliness: '🌟',
  ai_future_anxiety: '🤖', universal: '✨',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'var(--purple-subtle, oklch(0.25 0.06 290))', text: 'var(--purple)' },
  approved: { bg: 'var(--green-subtle, oklch(0.25 0.06 150))', text: 'var(--green)' },
  produced: { bg: 'var(--teal-subtle, oklch(0.25 0.06 190))', text: 'var(--teal)' },
  archived: { bg: 'oklch(0.22 0.014 260)', text: 'var(--text-tertiary)' },
};

const STATUS_FLOW = ['draft', 'approved', 'produced', 'archived'];

const CATEGORIES = [
  'self_belief', 'performance', 'mental_clarity', 'pre_interview', 'pre_test',
  'rock_bottom_recovery', 'chronic_illness', 'caregiver_burnout', 'parenting_anxiety',
  'sobriety_identity', 'neurodivergent_identity', 'body_image', 'grief_loss',
  'financial_healing', 'career_reinvention', 'relationship_healing', 'loneliness',
  'ai_future_anxiety', 'universal',
];

const MOODS = ['empowering', 'reflective', 'calming', 'intense', 'hopeful', 'melancholic', 'triumphant', 'ethereal'];
const STYLES = ['nature', 'abstract', 'urban', 'cosmic', 'minimal', 'organic'];
const STATUSES = ['draft', 'approved', 'produced', 'archived'];

export default function BackgroundLibrary() {
  return <Suspense fallback={<div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading...</div>}><LibraryInner /></Suspense>;
}

function LibraryInner() {
  const searchParams = useSearchParams();
  const [prompts, setPrompts] = useState<BgPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BgPrompt | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || '');
  const [filterMood, setFilterMood] = useState(searchParams.get('mood') || '');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const limit = 30;

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCategory) params.set('category', filterCategory);
    if (filterMood) params.set('mood', filterMood);
    if (filterStyle) params.set('style', filterStyle);
    if (filterStatus) params.set('status', filterStatus);
    if (search) params.set('search', search);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const res = await fetch(`/api/backgrounds?${params}`);
    const json = await res.json();
    setPrompts(json.data || []);
    setTotal(json.count || 0);
    setLoading(false);

    // Auto-select from URL param
    const urlId = searchParams.get('id');
    if (urlId && json.data) {
      const found = json.data.find((p: BgPrompt) => p.id === urlId);
      if (found) setSelected(found);
    }
  }, [filterCategory, filterMood, filterStyle, filterStatus, search, offset, searchParams]);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const handleStatusChange = async (prompt: BgPrompt, newStatus: string) => {
    await fetch('/api/backgrounds', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prompt.id, status: newStatus }),
    });
    fetchPrompts();
    if (selected?.id === prompt.id) setSelected({ ...prompt, status: newStatus });
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    await fetch('/api/backgrounds', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, title: editTitle, prompt: editPrompt, notes: editNotes }),
    });
    setEditing(false);
    fetchPrompts();
    setSelected({ ...selected, title: editTitle, prompt: editPrompt, notes: editNotes });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = (p: BgPrompt) => {
    setEditTitle(p.title);
    setEditPrompt(p.prompt);
    setEditNotes(p.notes || '');
    setEditing(true);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      {/* Left Panel - List */}
      <div style={{ width: 380, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Filters */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/backgrounds" style={{ fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none' }}>← Dashboard</Link>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{total} prompts</span>
          </div>
          <input
            placeholder="Search prompts..."
            value={search}
            onChange={e => { setSearch(e.target.value); setOffset(0); }}
            style={inputStyle}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setOffset(0); }} style={selectStyle}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={filterMood} onChange={e => { setFilterMood(e.target.value); setOffset(0); }} style={selectStyle}>
              <option value="">All Moods</option>
              {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterStyle} onChange={e => { setFilterStyle(e.target.value); setOffset(0); }} style={selectStyle}>
              <option value="">All Styles</option>
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setOffset(0); }} style={selectStyle}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Prompt List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : prompts.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>No prompts found</div>
          ) : prompts.map(p => (
            <div
              key={p.id}
              onClick={() => { setSelected(p); setEditing(false); }}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                background: selected?.id === p.id ? 'var(--bg-elevated)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {CATEGORY_ICONS[p.category] || '🎬'} {p.title}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge text={p.category.replace(/_/g, ' ')} />
                <Badge text={p.mood} color={MOOD_COLORS[p.mood]} />
                <Badge text={p.style} />
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} style={paginationBtn}>← Prev</button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{currentPage}/{totalPages}</span>
            <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} style={paginationBtn}>Next →</button>
          </div>
        )}
      </div>

      {/* Right Panel - Detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
              <div>Select a prompt to view details</div>
            </div>
          </div>
        ) : editing ? (
          /* Edit Mode */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Editing</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(false)} style={{ ...smallBtn, background: 'var(--bg-elevated)' }}>Cancel</button>
                <button onClick={handleSaveEdit} style={{ ...smallBtn, background: 'var(--accent)', color: 'white' }}>Save</button>
              </div>
            </div>
            <label style={labelStyle}>Title</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
            <label style={labelStyle}>Prompt</label>
            <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} rows={8} style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
            <label style={labelStyle}>Notes</label>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        ) : (
          /* View Mode */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>
                  {CATEGORY_ICONS[selected.category] || '🎬'} {selected.title}
                </h2>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge text={selected.category.replace(/_/g, ' ')} />
                  <Badge text={selected.mood} color={MOOD_COLORS[selected.mood]} />
                  <Badge text={selected.style} />
                  <Badge text={selected.motion_type} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => startEdit(selected)} style={smallBtn}>✏️ Edit</button>
                <button onClick={() => handleCopy(selected.prompt)} style={{ ...smallBtn, background: copied ? 'var(--green)' : 'var(--accent)', color: 'white' }}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Prompt Text */}
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: 16,
              marginBottom: 16,
              fontSize: '0.92rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}>
              {selected.prompt}
            </div>

            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <MetaItem label="Format" value={selected.format} />
              <MetaItem label="Platform" value={selected.platform} />
              <MetaItem label="Motion" value={selected.motion_type} />
              <MetaItem label="Color Palette" value={selected.color_palette || '—'} />
              <MetaItem label="Loop Friendly" value={selected.loop_friendly ? '✅ Yes' : '❌ No'} />
              <MetaItem label="Caption Safe" value={selected.caption_safe ? '✅ Yes' : '❌ No'} />
              <MetaItem label="Usage Count" value={String(selected.usage_count)} />
              <MetaItem label="Last Used" value={selected.last_used_at ? new Date(selected.last_used_at).toLocaleDateString() : 'Never'} />
            </div>

            {/* Tags */}
            {selected.tags && selected.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>Tags</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selected.tags.map(t => (
                    <span key={t} style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>#{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selected.notes && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>Notes</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{selected.notes}</div>
              </div>
            )}

            {/* Status Workflow */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>Status Workflow</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {STATUS_FLOW.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selected, s)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm, 4px)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: selected.status === s ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                      background: selected.status === s ? (STATUS_COLORS[s]?.bg || 'var(--bg-elevated)') : 'var(--bg-surface)',
                      color: selected.status === s ? (STATUS_COLORS[s]?.text || 'var(--text-primary)') : 'var(--text-tertiary)',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Timestamps */}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Created: {new Date(selected.created_at).toLocaleString()} • Updated: {new Date(selected.updated_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color?: string }) {
  return (
    <span style={{
      background: color ? `${color}22` : 'var(--bg-elevated)',
      color: color || 'var(--text-secondary)',
      fontSize: '0.72rem',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 'var(--radius-sm, 4px)',
      textTransform: 'capitalize',
    }}>{text}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return <span style={{ background: c.bg, color: c.text, fontSize: '0.68rem', fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-sm, 4px)', textTransform: 'capitalize' }}>{status}</span>;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md, 8px)', padding: '10px 12px' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.88rem', fontWeight: 500, textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  textTransform: 'capitalize',
};

const smallBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--radius-md, 8px)',
  fontSize: '0.82rem',
  fontWeight: 600,
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  color: 'var(--text-tertiary)',
  marginBottom: 4,
};

const paginationBtn: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm, 4px)',
  fontSize: '0.78rem',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
};
