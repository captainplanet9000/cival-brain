'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byMood: Record<string, number>;
  byStatus: Record<string, number>;
  recentCount: number;
}

interface Prompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  mood: string;
  usage_count: number;
}

const categoryColors: Record<string, string> = {
  forests: 'oklch(0.65 0.15 145)',
  grasslands: 'oklch(0.7 0.15 130)',
  garden: 'oklch(0.65 0.12 155)',
  botanicals: 'oklch(0.6 0.13 160)',
  sky: 'oklch(0.7 0.12 230)',
  weather: 'oklch(0.55 0.1 250)',
  ocean: 'oklch(0.6 0.15 230)',
  water: 'oklch(0.6 0.12 220)',
  desert: 'oklch(0.7 0.12 70)',
  mountains: 'oklch(0.55 0.08 250)',
  night: 'oklch(0.45 0.12 280)',
  light: 'oklch(0.75 0.12 80)',
  macro: 'oklch(0.6 0.15 30)',
  autumn: 'oklch(0.65 0.15 50)',
  golden_hour: 'oklch(0.7 0.15 60)',
  coastal: 'oklch(0.6 0.1 200)',
  wetland: 'oklch(0.55 0.1 170)',
  underwater: 'oklch(0.5 0.15 240)',
  rain_lakes: 'oklch(0.55 0.1 220)',
};

export default function BackgroundsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Prompt[]>([]);
  const [popular, setPopular] = useState<Prompt[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/backgrounds/stats').then(r => r.json()).then(setStats);
    fetch('/api/backgrounds?sort=newest&limit=6').then(r => r.json()).then(d => setRecent(d.data || []));
    fetch('/api/backgrounds?sort=most_used&limit=6').then(r => r.json()).then(d => setPopular(d.data || []));
  }, []);

  const statCards = stats ? [
    { label: 'Total Prompts', value: stats.total, color: 'oklch(0.65 0.15 250)' },
    { label: 'Draft', value: stats.byStatus?.draft || 0, color: 'oklch(0.6 0.05 250)' },
    { label: 'Approved', value: stats.byStatus?.approved || 0, color: 'oklch(0.65 0.15 145)' },
    { label: 'Produced', value: stats.byStatus?.produced || 0, color: 'oklch(0.65 0.15 250)' },
    { label: 'Categories', value: Object.keys(stats.byCategory || {}).length, color: 'oklch(0.65 0.12 30)' },
  ] : [];

  const categories = stats ? Object.entries(stats.byCategory || {}).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div style={{ minHeight: '100vh', background: 'oklch(0.13 0.01 250)', color: 'oklch(0.92 0 0)', padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>🎬 Background Prompt Library</h1>
            <p style={{ color: 'oklch(0.6 0 0)', margin: '4px 0 0' }}>Manage your video background prompts for TikTok</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/backgrounds/library" style={{ padding: '10px 20px', background: 'oklch(0.65 0.15 250)', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
              Browse Library
            </Link>
            <Link href="/backgrounds/generate" style={{ padding: '10px 20px', background: 'oklch(0.25 0.02 250)', color: 'oklch(0.8 0 0)', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid oklch(0.3 0.02 250)' }}>
              Generate New
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
          {statCards.map(s => (
            <div key={s.label} style={{ background: 'oklch(0.17 0.01 250)', borderRadius: 12, padding: '16px 20px', borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'oklch(0.55 0 0)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ position: 'relative' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && search) window.location.href = `/backgrounds/library?search=${encodeURIComponent(search)}`; }}
              placeholder="Search prompts... (press Enter)"
              style={{ width: '100%', padding: '14px 20px', background: 'oklch(0.17 0.01 250)', border: '1px solid oklch(0.25 0.02 250)', borderRadius: 12, color: 'oklch(0.9 0 0)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Category Grid */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Categories</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 40 }}>
          {categories.map(([cat, count]) => (
            <Link key={cat} href={`/backgrounds/library?category=${cat}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'oklch(0.17 0.01 250)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', border: '1px solid oklch(0.22 0.02 250)', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = categoryColors[cat] || 'oklch(0.4 0 0)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'oklch(0.22 0.02 250)'; }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: categoryColors[cat] || 'oklch(0.7 0 0)', textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'oklch(0.85 0 0)', marginTop: 2 }}>{count}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent & Popular */}
        {[{ title: 'Recent Prompts', items: recent }, { title: 'Most Used', items: popular }].map(section => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{section.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              {section.items.map(p => (
                <div key={p.id} style={{ background: 'oklch(0.17 0.01 250)', borderRadius: 10, padding: 16, border: '1px solid oklch(0.22 0.02 250)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: categoryColors[p.category] || 'oklch(0.3 0.05 250)', color: 'white', fontWeight: 600 }}>{p.category}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'oklch(0.25 0.02 250)', color: 'oklch(0.7 0 0)' }}>{p.mood}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: 'oklch(0.6 0 0)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.prompt}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
