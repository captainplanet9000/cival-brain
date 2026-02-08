'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BusinessUnit { id: string; name: string; slug: string; icon: string; description: string; status: string; config: any; created_at: string; }
interface ContentItem { id: string; title: string; stage: string; channel: string; business_unit_id: string; }

export default function ProjectsPage() {
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<BusinessUnit | null>(null);

  useEffect(() => {
    fetch('/api/ops/business-units').then(r => r.json()).then(d => Array.isArray(d) ? setUnits(d) : []);
    fetch('/api/ops/content-pipeline').then(r => r.json()).then(d => Array.isArray(d) ? setContent(d) : []);
  }, []);

  const getContentCount = (buId: string) => content.filter(c => c.business_unit_id === buId).length;
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
            onClick={() => setSelected(selected?.id === u.id ? null : u)}
            style={selected?.id === u.id ? { borderColor: 'var(--accent)' } : {}}
          >
            <div className="cat-icon">{u.icon}</div>
            <div className="cat-label">{u.name}</div>
            <div className="cat-count">{u.description}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className={`badge ${u.status === 'active' ? 'badge-areas' : 'badge-archive'}`}>{u.status}</span>
              <span className="badge badge-notes">{getContentCount(u.id)} content</span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div>
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
        </div>
      )}
    </div>
  );
}
