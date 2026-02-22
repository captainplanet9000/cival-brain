'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byMood: Record<string, number>;
  byStyle: Record<string, number>;
  byStatus: Record<string, number>;
  recentCount: number;
}

interface Prompt {
  id: string;
  title: string;
  category: string;
  mood: string;
  style: string;
  status: string;
  created_at: string;
}

const MOOD_COLORS: Record<string, string> = {
  empowering: 'var(--amber)',
  reflective: 'var(--purple)',
  calming: 'var(--teal)',
  intense: '#ef4444',
  hopeful: 'var(--green)',
  melancholic: '#6b7280',
  triumphant: 'var(--amber)',
  ethereal: '#a78bfa',
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

export default function BackgroundsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/backgrounds/stats').then(r => r.json()),
      fetch('/api/backgrounds?limit=10').then(r => r.json()),
    ]).then(([s, p]) => {
      setStats(s);
      setRecent(p.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading backgrounds...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>🎨 Backgrounds</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loopable video background prompts for TikTok</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/backgrounds/generate" style={btnStyle}>⚡ Generate</Link>
          <Link href="/backgrounds/library" style={{ ...btnStyle, background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>📚 Library</Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Prompts" value={stats?.total || 0} />
        <StatCard label="This Week" value={stats?.recentCount || 0} color="var(--accent)" />
        <StatCard label="Draft" value={stats?.byStatus?.draft || 0} color="var(--purple)" />
        <StatCard label="Approved" value={stats?.byStatus?.approved || 0} color="var(--green)" />
        <StatCard label="Produced" value={stats?.byStatus?.produced || 0} color="var(--teal)" />
        <StatCard label="Categories" value={Object.keys(stats?.byCategory || {}).length} color="var(--amber)" />
      </div>

      {/* Mood Breakdown */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>By Mood</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {Object.entries(stats?.byMood || {}).sort((a, b) => b[1] - a[1]).map(([mood, count]) => (
          <Link key={mood} href={`/backgrounds/library?mood=${mood}`} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '8px 14px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: MOOD_COLORS[mood] || 'var(--text-tertiary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize' }}>{mood}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{count}</span>
          </Link>
        ))}
      </div>

      {/* Category Grid */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>By Category</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 24 }}>
        {Object.entries(stats?.byCategory || {}).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
          <Link key={cat} href={`/backgrounds/library?category=${cat}`} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '12px 16px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[cat] || '🎬'}</span>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.88rem', textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{count} prompts</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Prompts */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>Recent Prompts</h2>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg, 12px)', overflow: 'hidden' }}>
        {recent.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No prompts yet. <Link href="/backgrounds/generate">Generate your first background prompt</Link>
          </div>
        ) : recent.map((p, i) => (
          <Link key={p.id} href={`/backgrounds/library?id=${p.id}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderBottom: i < recent.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            textDecoration: 'none',
            color: 'inherit',
          }}>
            <span style={{ fontSize: 16 }}>{CATEGORY_ICONS[p.category] || '🎬'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', gap: 8 }}>
                <span style={{ textTransform: 'capitalize' }}>{p.category.replace(/_/g, ' ')}</span>
                <span>•</span>
                <span style={{ textTransform: 'capitalize' }}>{p.mood}</span>
                <span>•</span>
                <span style={{ textTransform: 'capitalize' }}>{p.style}</span>
              </div>
            </div>
            <StatusBadge status={p.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md, 8px)',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      fontSize: '0.72rem',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 'var(--radius-sm, 4px)',
      textTransform: 'capitalize',
    }}>{status}</span>
  );
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 'var(--radius-md, 8px)',
  fontSize: '0.85rem',
  fontWeight: 600,
  background: 'var(--accent)',
  color: 'white',
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
};
