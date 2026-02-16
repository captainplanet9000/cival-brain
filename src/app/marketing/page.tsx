'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalContent: number;
  publishedThisWeek: number;
  scheduled: number;
  activeChannels: number;
  activeCampaigns: number;
  totalViews: number;
  totalEngagement: number;
  totalRevenue: number;
  byStatus: Record<string, number>;
  byPlatform: Record<string, number>;
}

interface Channel {
  id: string;
  name: string;
  platform: string;
  handle: string;
  followers: number;
  status: string;
  ops_business_units: { name: string } | null;
}

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  status: string;
  scheduled_for: string | null;
  created_at: string;
  ops_business_units: { name: string } | null;
}

const platformIcons: Record<string, string> = { tiktok: '🎵', twitter: '🐦', instagram: '📸', youtube: '🎬', facebook: '📘', linkedin: '💼' };
const platformColors: Record<string, string> = { tiktok: 'var(--rose)', twitter: 'var(--accent)', instagram: 'var(--purple)', youtube: 'var(--rose)', facebook: 'var(--accent)' };

const subPages = [
  { href: '/marketing/campaigns', label: 'Campaigns', icon: '🎯', desc: 'Manage campaign groups' },
  { href: '/marketing/content', label: 'Content Pipeline', icon: '📝', desc: 'Kanban content workflow' },
  { href: '/marketing/calendar', label: 'Calendar', icon: '📅', desc: 'Publishing schedule' },
  { href: '/marketing/channels', label: 'Channels', icon: '📡', desc: 'Social accounts' },
  { href: '/marketing/analytics', label: 'Analytics', icon: '📊', desc: 'Performance metrics' },
  { href: '/marketing/assets', label: 'Assets', icon: '🗂️', desc: 'Templates & brand' },
  { href: '/marketing/twitter', label: 'Twitter / X', icon: '🐦', desc: 'Tweet calendar & scheduling' },
];

export default function MarketingDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);

  useEffect(() => {
    fetch('/api/marketing/stats').then(r => r.json()).then(setStats);
    fetch('/api/marketing/channels').then(r => r.json()).then(d => setChannels(Array.isArray(d) ? d : []));
    fetch('/api/marketing/content').then(r => r.json()).then(d => setRecentContent(Array.isArray(d) ? d.slice(0, 8) : []));
  }, []);

  const s = stats;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>📢 Marketing HQ</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.92rem' }}>Content production, publishing & analytics across all channels</p>
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total Content', value: s?.totalContent ?? '—', color: 'var(--accent)' },
          { label: 'Published This Week', value: s?.publishedThisWeek ?? '—', color: 'var(--green)' },
          { label: 'Scheduled', value: s?.scheduled ?? '—', color: 'var(--amber)' },
          { label: 'Active Channels', value: s?.activeChannels ?? '—', color: 'var(--teal)' },
        ].map((st, i) => (
          <div key={i} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', padding: '18px 16px',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{st.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: st.color, fontVariantNumeric: 'tabular-nums' }}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        <Link href="/marketing/content" style={{
          flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
          color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.88rem',
          transition: 'all 0.15s',
        }}>✏️ New Content</Link>
        <Link href="/marketing/calendar" style={{
          flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
          color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.88rem',
        }}>📅 Schedule Post</Link>
        <Link href="/marketing/campaigns" style={{
          flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
          color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.88rem',
        }}>🎯 New Campaign</Link>
      </div>

      {/* Sub-pages grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 36 }}>
        {subPages.map(p => (
          <Link key={p.href} href={p.href} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', padding: 16, textDecoration: 'none',
            transition: 'all 0.2s',
          }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{p.icon}</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{p.label}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{p.desc}</div>
          </Link>
        ))}
      </div>

      {/* Calendar Preview Widget */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today&apos;s Schedule</div>
          <Link href="/marketing/calendar" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>View Calendar →</Link>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          {recentContent.filter(c => {
            if (!c.scheduled_for) return false;
            return new Date(c.scheduled_for).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
          }).length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: 12 }}>No content scheduled for today</p>
          ) : (
            recentContent.filter(c => c.scheduled_for && new Date(c.scheduled_for).toISOString().split('T')[0] === new Date().toISOString().split('T')[0])
              .map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>{platformIcons[c.platform] || '📱'}</span>
                  <span style={{ flex: 1, fontSize: '0.84rem', fontWeight: 500 }}>{c.title}</span>
                  <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 100, background: 'var(--bg-elevated)', textTransform: 'capitalize', color: 'var(--text-tertiary)' }}>{c.status}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                    {c.scheduled_for ? new Date(c.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Content velocity (simple bar chart) */}
      {s && Object.keys(s.byStatus).length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Content by Status</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
            {Object.entries(s.byStatus).map(([status, count]) => {
              const max = Math.max(...Object.values(s.byStatus));
              const h = max > 0 ? (count / max) * 100 : 0;
              const colors: Record<string, string> = { idea: 'var(--purple)', scripted: 'var(--accent)', producing: 'var(--amber)', review: 'var(--teal)', scheduled: 'var(--green)', published: 'var(--text-tertiary)' };
              return (
                <div key={status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>{count}</span>
                  <div style={{ width: '100%', height: `${h}%`, minHeight: 4, background: colors[status] || 'var(--accent)', borderRadius: 'var(--radius-sm)' }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Channel Health */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Channel Health</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {channels.map(ch => (
            <div key={ch.id} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: '1.2rem' }}>{platformIcons[ch.platform] || '📱'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{ch.handle}</div>
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: ch.status === 'active' ? 'var(--green)' : 'var(--text-tertiary)',
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Content */}
      {recentContent.length > 0 && (
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Recent Content</div>
          {recentContent.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
            }}>
              <span>{platformIcons[c.platform] || '📱'}</span>
              <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500 }}>{c.title}</span>
              <span style={{
                fontSize: '0.68rem', padding: '2px 8px', borderRadius: 100,
                background: 'var(--bg-elevated)', color: platformColors[c.platform] || 'var(--text-tertiary)',
                textTransform: 'capitalize',
              }}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
