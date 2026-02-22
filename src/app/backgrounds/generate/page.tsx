'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CATEGORIES = [
  'self_belief', 'performance', 'mental_clarity', 'pre_interview', 'pre_test',
  'rock_bottom_recovery', 'chronic_illness', 'caregiver_burnout', 'parenting_anxiety',
  'sobriety_identity', 'neurodivergent_identity', 'body_image', 'grief_loss',
  'financial_healing', 'career_reinvention', 'relationship_healing', 'loneliness',
  'ai_future_anxiety', 'universal',
];

const MOODS = ['empowering', 'reflective', 'calming', 'intense', 'hopeful', 'melancholic', 'triumphant', 'ethereal'];
const STYLES = ['nature', 'abstract', 'urban', 'cosmic', 'minimal', 'organic'];
const MOTION_TYPES = ['slow_drift', 'float', 'parallax', 'pulse', 'orbit', 'zoom', 'static'];

const CATEGORY_ICONS: Record<string, string> = {
  self_belief: '💪', performance: '🏆', mental_clarity: '🧘', pre_interview: '👔', pre_test: '📝',
  rock_bottom_recovery: '🌅', chronic_illness: '💜', caregiver_burnout: '🤲', parenting_anxiety: '👶',
  sobriety_identity: '🌿', neurodivergent_identity: '🧩', body_image: '🪞', grief_loss: '🕊️',
  financial_healing: '🌱', career_reinvention: '🦋', relationship_healing: '💛', loneliness: '🌟',
  ai_future_anxiety: '🤖', universal: '✨',
};

interface GeneratedPrompt {
  title: string;
  prompt: string;
  saved?: boolean;
}

interface CategoryStats {
  [category: string]: number;
}

export default function BackgroundGenerator() {
  const [category, setCategory] = useState('universal');
  const [mood, setMood] = useState('calming');
  const [style, setStyle] = useState('nature');
  const [motionType, setMotionType] = useState('slow_drift');
  const [colorPalette, setColorPalette] = useState('');
  const [batchCount, setBatchCount] = useState(1);
  const [generated, setGenerated] = useState<GeneratedPrompt[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<CategoryStats>({});

  useEffect(() => {
    fetch('/api/backgrounds/stats').then(r => r.json()).then(s => {
      setSuggestions(s.byCategory || {});
    }).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/backgrounds/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, mood, style, motion_type: motionType, color_palette: colorPalette || undefined, count: batchCount }),
      });
      const json = await res.json();
      setGenerated(json.prompts || []);
    } catch {
      setGenerated([]);
    }
    setGenerating(false);
  };

  const handleSave = async (index: number) => {
    const p = generated[index];
    if (!p || p.saved) return;
    setSaving(index);
    try {
      await fetch('/api/backgrounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: p.title,
          prompt: p.prompt,
          category,
          mood,
          style,
          motion_type: motionType,
          color_palette: colorPalette || null,
          tags: [],
        }),
      });
      const updated = [...generated];
      updated[index] = { ...p, saved: true };
      setGenerated(updated);
    } catch {}
    setSaving(null);
  };

  const handleSaveAll = async () => {
    for (let i = 0; i < generated.length; i++) {
      if (!generated[i].saved) await handleSave(i);
    }
  };

  // Find categories with fewest prompts for suggestions
  const sortedCategories = CATEGORIES
    .map(c => ({ cat: c, count: suggestions[c] || 0 }))
    .sort((a, b) => a.count - b.count);

  const needsMore = sortedCategories.filter(c => c.count < 3).slice(0, 5);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>⚡ Background Generator</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Generate loopable video background prompts</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/backgrounds" style={{ ...btnOutline, textDecoration: 'none' }}>← Dashboard</Link>
          <Link href="/backgrounds/library" style={{ ...btnOutline, textDecoration: 'none' }}>📚 Library</Link>
        </div>
      </div>

      {/* Smart Suggestions */}
      {needsMore.length > 0 && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: 16,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 8, color: 'var(--amber)' }}>💡 Categories needing more backgrounds</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {needsMore.map(({ cat, count }) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  fontSize: '0.78rem',
                  background: category === cat ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: category === cat ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {CATEGORY_ICONS[cat] || '🎬'} {cat.replace(/_/g, ' ')} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generator Form */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c] || ''} {c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Mood</label>
            <select value={mood} onChange={e => setMood(e.target.value)} style={selectStyle}>
              {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Style</label>
            <select value={style} onChange={e => setStyle(e.target.value)} style={selectStyle}>
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Motion Type</label>
            <select value={motionType} onChange={e => setMotionType(e.target.value)} style={selectStyle}>
              {MOTION_TYPES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Color Palette (optional)</label>
            <input
              value={colorPalette}
              onChange={e => setColorPalette(e.target.value)}
              placeholder="e.g., deep navy, gold, soft white"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Batch Count</label>
            <select value={batchCount} onChange={e => setBatchCount(Number(e.target.value))} style={selectStyle}>
              {[1, 3, 5, 10].map(n => <option key={n} value={n}>{n} prompt{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              ...btnPrimary,
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? '⏳ Generating...' : `⚡ Generate ${batchCount > 1 ? batchCount + ' Prompts' : 'Prompt'}`}
          </button>
          {generated.length > 1 && generated.some(g => !g.saved) && (
            <button onClick={handleSaveAll} style={btnOutline}>
              💾 Save All to Library
            </button>
          )}
        </div>
      </div>

      {/* Generated Results */}
      {generated.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>Generated Prompts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {generated.map((g, i) => (
              <div key={i} style={{
                background: 'var(--bg-surface)',
                border: g.saved ? '1px solid var(--green)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {g.saved && <span style={{ color: 'var(--green)', marginRight: 6 }}>✓</span>}
                    {g.title}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { navigator.clipboard.writeText(g.prompt); }}
                      style={smallBtn}
                    >
                      📋 Copy
                    </button>
                    {!g.saved && (
                      <button
                        onClick={() => handleSave(i)}
                        disabled={saving === i}
                        style={{ ...smallBtn, background: 'var(--accent)', color: 'white', border: 'none' }}
                      >
                        {saving === i ? '⏳' : '💾 Save'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: 12,
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                }}>
                  {g.prompt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  color: 'var(--text-tertiary)',
  marginBottom: 4,
  fontWeight: 600,
};

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

const btnPrimary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-md, 8px)',
  fontSize: '0.9rem',
  fontWeight: 600,
  background: 'var(--accent)',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-md, 8px)',
  fontSize: '0.85rem',
  fontWeight: 600,
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)',
  cursor: 'pointer',
};

const smallBtn: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm, 4px)',
  fontSize: '0.78rem',
  fontWeight: 600,
  background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-subtle)',
  cursor: 'pointer',
};
