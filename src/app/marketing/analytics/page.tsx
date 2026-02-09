'use client';
import { useEffect, useState } from 'react';

interface Stats {
  totalContent: number; publishedThisWeek: number; scheduled: number;
  activeChannels: number; totalViews: number; totalEngagement: number;
  totalRevenue: number; byStatus: Record<string, number>; byPlatform: Record<string, number>;
}

interface ContentItem {
  id: string; title: string; platform: string; status: string;
  performance: { views?: number; likes?: number; shares?: number; comments?: number; saves?: number };
  published_at: string | null;
  ops_business_units: { name: string } | null;
}

const platformIcons: Record<string, string> = { tiktok: '🎵', twitter: '🐦', instagram: '📸', youtube: '🎬', facebook: '📘' };
const platformColors: Record<string, string> = { tiktok: 'var(--rose)', twitter: 'var(--accent)', instagram: 'var(--purple)', youtube: 'var(--rose)' };

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('all');

  useEffect(() => {
    fetch('/api/marketing/stats').then(r => r.json()).then(setStats);
    fetch('/api/marketing/content').then(r => r.json()).then(d => setContent(Array.isArray(d) ? d : []));
  }, []);

  const now = new Date();
  const ranges: Record<string, Date> = {
    week: new Date(now.getTime() - 7 * 86400000),
    month: new Date(now.getTime() - 30 * 86400000),
    all: new Date(0),
  };

  const filtered = content.filter(c => {
    if (timeRange === 'all') return true;
    const d = c.published_at ? new Date(c.published_at) : null;
    return d && d >= ranges[timeRange];
  });

  const published = filtered.filter(c => c.status === 'published');
  const topContent = [...published].sort((a, b) => ((b.performance?.views || 0) - (a.performance?.views || 0))).slice(0, 10);

  // By business unit
  const byBU: Record<string, { count: number; views: number }> = {};
  for (const c of filtered) {
    const name = c.ops_business_units?.name || 'Unassigned';
    if (!byBU[name]) byBU[name] = { count: 0, views: 0 };
    byBU[name].count++;
    byBU[name].views += c.performance?.views || 0;
  }

  const s = stats;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>📊 Analytics</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Performance metrics across all channels</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['week', 'month', 'all'] as const).map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{
              padding: '4px 12px', borderRadius: 100, border: '1px solid var(--border-subtle)',
              background: timeRange === r ? 'var(--accent-subtle)' : 'transparent',
              color: timeRange === r ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
            }}>{r === 'all' ? 'All Time' : `This ${r}`}</button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total Views', value: s?.totalViews?.toLocaleString() ?? '0', color: 'var(--accent)' },
          { label: 'Total Engagement', value: s?.totalEngagement?.toLocaleString() ?? '0', color: 'var(--green)' },
          { label: 'Content Published', value: published.length, color: 'var(--teal)' },
          { label: 'Revenue', value: `$${s?.totalRevenue?.toFixed(2) ?? '0.00'}`, color: 'var(--amber)' },
        ].map((st, i) => (
          <div key={i} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', padding: '18px 16px',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{st.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: st.color }}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* Performance by Platform */}
      {s && Object.keys(s.byPlatform).length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>By Platform</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {Object.entries(s.byPlatform).map(([plat, count]) => (
              <div key={plat} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: '1.4rem' }}>{platformIcons[plat] || '📱'}</span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: platformColors[plat] || 'var(--text-primary)' }}>{count}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{plat}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Business Unit */}
      {Object.keys(byBU).length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>By Business Unit</div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {Object.entries(byBU).map(([name, data], i) => (
              <div key={name} style={{
                display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
                borderBottom: i < Object.keys(byBU).length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{name}</span>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                  <span>{data.count} items</span>
                  <span>{data.views.toLocaleString()} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Performing Content */}
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Top Performing Content</div>
        {topContent.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No published content with performance data yet.</p>}
        {topContent.map((c, i) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-tertiary)', width: 20 }}>#{i + 1}</span>
            <span>{platformIcons[c.platform]}</span>
            <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500 }}>{c.title}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              {(c.performance?.views || 0).toLocaleString()} views
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
