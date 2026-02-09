'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byFramework: { id: string; name: string; slug: string; count: number }[];
  byCategory: Record<string, number>;
  recentGenerations: any[];
  seriesCount: number;
}

interface Script {
  id: string;
  title: string;
  category: string;
  status: string;
  series_name: string;
  episode_number: number;
  word_count: number;
  estimated_duration_secs: number;
  created_at: string;
  script_frameworks: { name: string; slug: string; channel: string } | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'var(--purple-subtle)', text: 'var(--purple)' },
  review: { bg: 'var(--amber-subtle)', text: 'var(--amber)' },
  approved: { bg: 'var(--green-subtle)', text: 'var(--green)' },
  produced: { bg: 'var(--teal-subtle)', text: 'var(--teal)' },
  published: { bg: 'oklch(0.22 0.014 260)', text: 'var(--text-tertiary)' },
};

const FRAMEWORK_ICONS: Record<string, string> = {
  asmpro: '🎯',
  tension: '📖',
  claymation: '🎭',
};

export default function ScriptsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/scripts/stats').then(r => r.json()),
      fetch('/api/scripts?limit=10').then(r => r.json()),
    ]).then(([s, sc]) => {
      setStats(s);
      setScripts(sc.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading scripts...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>✍️ Scripts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>AI-powered script generation & management</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/scripts/generate" style={btnStyle}>⚡ Generate</Link>
          <Link href="/scripts/library" style={{ ...btnStyle, background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>📚 Library</Link>
          <Link href="/scripts/frameworks" style={{ ...btnStyle, background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>🔧 Frameworks</Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Scripts" value={stats?.total || 0} />
        <StatCard label="Series" value={stats?.seriesCount || 0} />
        <StatCard label="Draft" value={stats?.byStatus?.draft || 0} color="var(--purple)" />
        <StatCard label="Approved" value={stats?.byStatus?.approved || 0} color="var(--green)" />
        <StatCard label="Produced" value={stats?.byStatus?.produced || 0} color="var(--teal)" />
        <StatCard label="Generations" value={stats?.recentGenerations?.length || 0} color="var(--amber)" />
      </div>

      {/* Framework Cards */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>Frameworks</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
        {(stats?.byFramework || []).map(f => (
          <Link key={f.id} href={`/scripts/library?framework=${f.slug}`} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            textDecoration: 'none',
            color: 'inherit',
            transition: 'border-color var(--transition-fast)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{FRAMEWORK_ICONS[f.slug] || '📝'}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{f.name}</div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>{f.count} scripts</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Scripts */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>Recent Scripts</h2>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {scripts.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No scripts yet. <Link href="/scripts/generate">Generate your first script</Link> or import existing ones.
          </div>
        ) : scripts.map((s, i) => (
          <Link key={s.id} href={`/scripts/library?id=${s.id}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderBottom: i < scripts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            textDecoration: 'none',
            color: 'inherit',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', gap: 8 }}>
                {s.script_frameworks && <span>{FRAMEWORK_ICONS[s.script_frameworks.slug] || ''} {s.script_frameworks.name}</span>}
                {s.category && <span>• {s.category}</span>}
                {s.series_name && <span>• {s.series_name} Ep.{s.episode_number}</span>}
              </div>
            </div>
            <StatusBadge status={s.status} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              {s.word_count}w • {s.estimated_duration_secs}s
            </span>
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
      borderRadius: 'var(--radius-md)',
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
      borderRadius: 'var(--radius-sm)',
      textTransform: 'capitalize',
    }}>{status}</span>
  );
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.85rem',
  fontWeight: 600,
  background: 'var(--accent)',
  color: 'white',
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
};
