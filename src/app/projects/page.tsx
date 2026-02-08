'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BusinessUnit { id: string; name: string; slug: string; icon: string; description: string; status: string; config: any; created_at: string; category: string; }
interface ContentItem { id: string; title: string; stage: string; channel: string; business_unit_id: string; }
interface Mission { id: string; title: string; status: string; created_by: string; }
interface RevenueEntry { id: string; business_unit_id: string; amount: number; source: string; }

export default function ProjectsPage() {
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [revenue, setRevenue] = useState<RevenueEntry[]>([]);
  const [selected, setSelected] = useState<BusinessUnit | null>(null);
  const [tab, setTab] = useState<'content' | 'missions' | 'revenue'>('content');

  useEffect(() => {
    fetch('/api/ops/business-units').then(r => r.json()).then(d => Array.isArray(d) ? setUnits(d) : []);
    fetch('/api/ops/content-pipeline').then(r => r.json()).then(d => Array.isArray(d) ? setContent(d) : []);
    fetch('/api/ops/missions').then(r => r.json()).then(d => Array.isArray(d) ? setMissions(d) : []);
    fetch('/api/ops/revenue').then(r => r.json()).then(d => Array.isArray(d) ? setRevenue(d) : []);
  }, []);

  const getContentCount = (buId: string) => content.filter(c => c.business_unit_id === buId).length;
  const getRevenueTotal = (buId: string) => revenue.filter(r => r.business_unit_id === buId).reduce((s, r) => s + Number(r.amount), 0);
  const getUnitContent = (buId: string) => content.filter(c => c.business_unit_id === buId);

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <div className="dash-hero">
        <h1>🏢 Projects</h1>
        <p>GWDS Business Units</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 32 }}>
        {units.map(u => (
          <div
            key={u.id}
            className={`cat-card ${selected?.id === u.id ? 'active' : ''}`}
            onClick={() => { setSelected(selected?.id === u.id ? null : u); setTab('content'); }}
            style={selected?.id === u.id ? { borderColor: 'var(--accent)' } : {}}
          >
            <div className="cat-icon">{u.icon}</div>
            <div className="cat-label">{u.name}</div>
            <div className="cat-count" style={{ fontSize: '0.78rem' }}>{u.description}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span className={`badge ${u.status === 'active' ? 'badge-areas' : 'badge-archive'}`}>{u.status}</span>
              <span className="badge badge-notes">{getContentCount(u.id)} content</span>
              {getRevenueTotal(u.id) > 0 && (
                <span className="badge badge-journal">${getRevenueTotal(u.id).toLocaleString()}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setTab('content')} style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: tab === 'content' ? 'var(--accent-subtle)' : 'var(--bg-surface)', color: tab === 'content' ? 'var(--accent)' : 'var(--text-secondary)' }}>🎬 Content</button>
            <button onClick={() => setTab('missions')} style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: tab === 'missions' ? 'var(--accent-subtle)' : 'var(--bg-surface)', color: tab === 'missions' ? 'var(--accent)' : 'var(--text-secondary)' }}>📋 Missions</button>
            <button onClick={() => setTab('revenue')} style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: tab === 'revenue' ? 'var(--accent-subtle)' : 'var(--bg-surface)', color: tab === 'revenue' ? 'var(--accent)' : 'var(--text-secondary)' }}>💰 Revenue</button>
          </div>

          {tab === 'content' && (
            <>
              <div className="section-heading">{selected.icon} {selected.name} — Content</div>
              {getUnitContent(selected.id).length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 16 }}>
                  No content items yet. <Link href="/content" style={{ color: 'var(--accent)' }}>Create one →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {getUnitContent(selected.id).map(c => (
                    <div key={c.id} className="ops-mission-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.title}</span>
                        <span className="badge badge-notes">{c.stage}</span>
                      </div>
                      {c.channel && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{c.channel}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'revenue' && (
            <>
              <div className="section-heading">{selected.icon} {selected.name} — Revenue</div>
              {revenue.filter(r => r.business_unit_id === selected.id).length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 16 }}>
                  No revenue entries. <Link href="/revenue" style={{ color: 'var(--accent)' }}>Add one →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {revenue.filter(r => r.business_unit_id === selected.id).map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{r.source}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>${Number(r.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'missions' && (
            <>
              <div className="section-heading">{selected.icon} {selected.name} — Missions</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 16 }}>
                <Link href="/ops/missions" style={{ color: 'var(--accent)' }}>View all missions →</Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
