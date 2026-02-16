'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface DocMeta { title: string; slug: string; category: string; categoryLabel: string; modified: string; wordCount: number; }
interface Task { id: string; title: string; status: string; priority: string; tags: string[]; }
interface Pin { id: string; content: string; color: string; tags: string[]; pinned: boolean; archived: boolean; }
interface OpsStats { agents: number; missions: number; events: number; units: number; content: number; revenue: number; proposals: number; recentEvents: any[]; }
interface CalJob { id: string; title: string; platform: string; status: string; scheduled_for: string | null; tasks?: { status: string }[]; }

const COLOR_MAP: Record<string, string> = {
  yellow: 'oklch(0.28 0.06 75)', blue: 'oklch(0.25 0.06 250)', green: 'oklch(0.25 0.06 155)', pink: 'oklch(0.25 0.06 15)', purple: 'oklch(0.25 0.06 300)',
};
const SECTION_MAP: Record<string, { icon: string; label: string }> = {
  projects: { icon: '🚀', label: 'Projects' }, areas: { icon: '🔄', label: 'Areas' }, resources: { icon: '📚', label: 'Resources' },
  archive: { icon: '📦', label: 'Archive' }, notes: { icon: '📁', label: 'Notes' }, journal: { icon: '📅', label: 'Journal' }, memory: { icon: '🧠', label: 'Memory' },
};

export default function Home() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [opsStats, setOpsStats] = useState<OpsStats | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<string>('checking');
  const [todayJobs, setTodayJobs] = useState<CalJob[]>([]);

  useEffect(() => {
    fetch('/api/documents').then(r => r.json()).then(setDocs);
    fetch('/api/tasks').then(r => r.json()).then(setTasks);
    fetch('/api/pins').then(r => r.json()).then(setPins);
    fetch('/api/ops/stats').then(r => r.json()).then(setOpsStats);
    fetch('/api/openclaw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status' }) })
      .then(r => r.json()).then(d => setGatewayStatus(d.status || 'offline')).catch(() => setGatewayStatus('offline'));
    // Load today's calendar jobs
    Promise.all([
      fetch('/api/marketing/content').then(r => r.json()),
      fetch('/api/marketing/tasks').then(r => r.json()),
    ]).then(([content, tasks]) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const taskMap: Record<string, any[]> = {};
      if (Array.isArray(tasks)) tasks.forEach((t: any) => { if (!taskMap[t.content_id]) taskMap[t.content_id] = []; taskMap[t.content_id].push(t); });
      const tj = (Array.isArray(content) ? content : [])
        .filter((c: any) => c.scheduled_for && new Date(c.scheduled_for).toISOString().split('T')[0] === todayStr)
        .map((c: any) => ({ ...c, tasks: taskMap[c.id] || [] }));
      setTodayJobs(tj);
    }).catch(() => {});
  }, []);

  const totalWords = useMemo(() => docs.reduce((s, d) => s + d.wordCount, 0), [docs]);
  const recent = useMemo(() => [...docs].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()).slice(0, 5), [docs]);
  const recentPins = useMemo(() => pins.filter(p => !p.archived).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).slice(0, 4), [pins]);
  const taskCounts = useMemo(() => {
    const c: Record<string, number> = { backlog: 0, 'in-progress': 0, review: 0, done: 0 };
    tasks.forEach(t => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [tasks]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso); const diff = Date.now() - d.getTime();
    if (diff < 86400000) return 'Today'; if (diff < 172800000) return 'Yesterday';
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const cleanName = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="page-container">
      <div className="dashboard">
        <div className="dash-hero">
          <h1>Your Cival Brain</h1>
          <p>All your knowledge, organized and searchable.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: '0.78rem', color: gatewayStatus === 'online' ? 'var(--green)' : 'var(--text-tertiary)' }}>
              ● OpenClaw: {gatewayStatus}
            </span>
          </div>
        </div>

        {/* Ops Stats */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">📄 Documents</div><div className="stat-value">{docs.length}</div></div>
          <div className="stat-card"><div className="stat-label">📝 Words</div><div className="stat-value">{totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}</div></div>
          <div className="stat-card"><div className="stat-label">📋 Active Tasks</div><div className="stat-value">{taskCounts['in-progress'] + taskCounts['review']}</div></div>
          <div className="stat-card"><div className="stat-label">📌 Pins</div><div className="stat-value">{pins.filter(p => !p.archived).length}</div></div>
        </div>

        {opsStats && (
          <div className="stats-grid" style={{ marginTop: 8 }}>
            <div className="stat-card"><div className="stat-label">🤖 Agents</div><div className="stat-value">{opsStats.agents}</div></div>
            <div className="stat-card"><div className="stat-label">🎯 Missions</div><div className="stat-value">{opsStats.missions}</div></div>
            <div className="stat-card"><div className="stat-label">🏢 Business Units</div><div className="stat-value">{opsStats.units}</div></div>
            <div className="stat-card"><div className="stat-label">📡 Events</div><div className="stat-value">{opsStats.events}</div></div>
            <div className="stat-card"><div className="stat-label">🎬 Content</div><div className="stat-value">{opsStats.content}</div></div>
            <div className="stat-card">
              <div className="stat-label">💰 Revenue</div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>${opsStats.revenue.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Task Summary */}
        <div className="section-heading">Task Summary</div>
        <div className="task-summary-grid">
          {[
            { key: 'backlog', label: 'Backlog', color: 'var(--text-tertiary)' },
            { key: 'in-progress', label: 'In Progress', color: 'var(--accent)' },
            { key: 'review', label: 'Review', color: 'var(--amber)' },
            { key: 'done', label: 'Done', color: 'var(--green)' },
          ].map(col => (
            <div key={col.key} className="task-summary-card">
              <div className="task-summary-dot" style={{ background: col.color }} />
              <div className="task-summary-label">{col.label}</div>
              <div className="task-summary-count">{taskCounts[col.key] || 0}</div>
            </div>
          ))}
        </div>

        {/* Recent Events from Supabase */}
        {opsStats && opsStats.recentEvents.length > 0 && (
          <>
            <div className="section-heading">Recent Agent Events</div>
            <div className="ops-feed" style={{ marginBottom: 24 }}>
              {opsStats.recentEvents.map((e: any) => (
                <div key={e.id} className="ops-feed-item">
                  <div className="ops-feed-dot" style={{ background: 'var(--accent)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ops-feed-title">{e.title}</div>
                    <div className="ops-feed-summary">{e.summary}</div>
                    <div className="ops-feed-meta">
                      <span className="badge badge-notes">{e.agent_id}</span>
                      <span>{e.kind}</span>
                      <span>{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Today's Production Calendar */}
        {todayJobs.length > 0 && (
          <>
            <div className="section-heading">📅 Today&apos;s Production ({todayJobs.length} jobs)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 24 }}>
              {todayJobs.slice(0, 6).map((j: CalJob) => {
                const pIcons: Record<string,string> = { tiktok: '🎵', twitter: '🐦', instagram: '📸', youtube: '🎬', facebook: '📘', linkedin: '💼' };
                const tasks = j.tasks || [];
                const done = tasks.filter((t: any) => t.status === 'done').length;
                const total = tasks.length;
                const color = total === 0 ? 'var(--text-tertiary)' : done === total ? 'var(--green)' : done > 0 ? 'var(--amber)' : 'var(--rose)';
                return (
                  <Link key={j.id} href="/marketing/calendar" style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${color}`,
                    borderRadius: 'var(--radius-md)', padding: '10px 12px', textDecoration: 'none', display: 'block',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{pIcons[j.platform] || '📱'}</span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{j.title}</span>
                    </div>
                    {total > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                          <div style={{ width: `${(done/total)*100}%`, height: '100%', background: color, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color, fontWeight: 600 }}>{done}/{total}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Quick Links */}
        <div className="section-heading">Quick Links</div>
        <div className="quick-links" style={{ flexWrap: 'wrap' }}>
          <Link href="/tasks" className="quick-link-card"><span>📋</span> Tasks</Link>
          <Link href="/documents" className="quick-link-card"><span>📄</span> Documents</Link>
          <Link href="/pinboard" className="quick-link-card"><span>📌</span> Pinboard</Link>
          <Link href="/timeline" className="quick-link-card"><span>⏳</span> Timeline</Link>
          <Link href="/calendar" className="quick-link-card"><span>📅</span> Calendar</Link>
          <Link href="/search" className="quick-link-card"><span>🔍</span> Search</Link>
          <Link href="/digests" className="quick-link-card"><span>📰</span> Digests</Link>
          <Link href="/ops" className="quick-link-card"><span>🎯</span> Ops Hub</Link>
          <Link href="/projects" className="quick-link-card"><span>🏢</span> Projects</Link>
          <Link href="/content" className="quick-link-card"><span>🎬</span> Content</Link>
          <Link href="/revenue" className="quick-link-card"><span>💰</span> Revenue</Link>
          <Link href="/chat" className="quick-link-card"><span>💬</span> Chat</Link>
        </div>

        {/* Recent Pins */}
        {recentPins.length > 0 && (
          <>
            <div className="section-heading">Recent Pins</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 36 }}>
              {recentPins.map(p => (
                <div key={p.id} style={{
                  background: COLOR_MAP[p.color] || COLOR_MAP.yellow,
                  borderRadius: 'var(--radius-lg)', padding: 14,
                  fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5,
                }}>
                  {p.pinned && <span style={{ marginRight: 4 }}>📌</span>}
                  {p.content.slice(0, 80)}{p.content.length > 80 ? '…' : ''}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Recent Documents */}
        <div className="section-heading">Recently Modified</div>
        <ul className="recent-list">
          {recent.map(d => (
            <li key={d.slug}>
              <Link className="recent-item" href={`/documents?doc=${encodeURIComponent(d.slug)}`}>
                <span className="name">{cleanName(d.title)}</span>
                <span className={`item-badge badge badge-${d.category}`}>{SECTION_MAP[d.category]?.icon}</span>
                <span className="date">{fmtDate(d.modified)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
