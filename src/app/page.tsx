'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface DocMeta {
  title: string;
  slug: string;
  category: string;
  categoryLabel: string;
  modified: string;
  wordCount: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  tags: string[];
}

interface Pin {
  id: string;
  content: string;
  color: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
}

const COLOR_MAP: Record<string, string> = {
  yellow: 'oklch(0.28 0.06 75)',
  blue: 'oklch(0.25 0.06 250)',
  green: 'oklch(0.25 0.06 155)',
  pink: 'oklch(0.25 0.06 15)',
  purple: 'oklch(0.25 0.06 300)',
};

const SECTION_MAP: Record<string, { icon: string; label: string }> = {
  projects: { icon: '🚀', label: 'Projects' },
  areas: { icon: '🔄', label: 'Areas' },
  resources: { icon: '📚', label: 'Resources' },
  archive: { icon: '📦', label: 'Archive' },
  notes: { icon: '📁', label: 'Notes' },
  journal: { icon: '📅', label: 'Journal' },
  memory: { icon: '🧠', label: 'Memory' },
};

export default function Home() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);

  useEffect(() => {
    fetch('/api/documents').then(r => r.json()).then(setDocs);
    fetch('/api/tasks').then(r => r.json()).then(setTasks);
    fetch('/api/pins').then(r => r.json()).then(setPins);
  }, []);

  const totalWords = useMemo(() => docs.reduce((s, d) => s + d.wordCount, 0), [docs]);
  const recent = useMemo(() =>
    [...docs].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()).slice(0, 5),
    [docs]
  );

  const recentPins = useMemo(() =>
    pins.filter(p => !p.archived).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).slice(0, 4),
    [pins]
  );

  const taskCounts = useMemo(() => {
    const c: Record<string, number> = { backlog: 0, 'in-progress': 0, review: 0, done: 0 };
    tasks.forEach(t => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [tasks]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
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
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Documents</div>
            <div className="stat-value">{docs.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Words</div>
            <div className="stat-value">{totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Tasks</div>
            <div className="stat-value">{taskCounts['in-progress'] + taskCounts['review']}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pins</div>
            <div className="stat-value">{pins.filter(p => !p.archived).length}</div>
          </div>
        </div>

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
