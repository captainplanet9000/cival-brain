'use client';

import { useEffect, useState } from 'react';

interface RevenueEntry {
  id: string;
  business_unit_id: string;
  amount: number;
  currency: string;
  source: string;
  description: string;
  recorded_at: string;
  metadata: any;
}

interface BusinessUnit { id: string; name: string; slug: string; icon: string; }

export default function RevenuePage() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [filterUnit, setFilterUnit] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: '', currency: 'USD', source: '', description: '', business_unit_id: '', recorded_at: new Date().toISOString().slice(0, 10) });

  const load = () => {
    let url = '/api/ops/revenue?';
    if (filterUnit) url += `business_unit_id=${filterUnit}&`;
    fetch(url).then(r => r.json()).then(d => Array.isArray(d) ? setEntries(d) : setEntries([]));
  };

  useEffect(() => {
    load();
    fetch('/api/ops/business-units').then(r => r.json()).then(d => Array.isArray(d) ? setUnits(d) : []);
  }, [filterUnit]);

  const create = async () => {
    if (!form.amount || !form.source) return;
    await fetch('/api/ops/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        business_unit_id: form.business_unit_id || null,
        recorded_at: new Date(form.recorded_at).toISOString(),
      }),
    });
    setForm({ amount: '', currency: 'USD', source: '', description: '', business_unit_id: '', recorded_at: new Date().toISOString().slice(0, 10) });
    setShowCreate(false);
    load();
  };

  const totalRevenue = entries.reduce((s, e) => s + Number(e.amount), 0);
  const sources = [...new Set(entries.map(e => e.source).filter(Boolean))];

  // Group by business unit
  const byUnit: Record<string, { name: string; icon: string; total: number; count: number }> = {};
  entries.forEach(e => {
    const u = units.find(u => u.id === e.business_unit_id);
    const key = e.business_unit_id || 'unassigned';
    if (!byUnit[key]) byUnit[key] = { name: u?.name || 'Unassigned', icon: u?.icon || '📦', total: 0, count: 0 };
    byUnit[key].total += Number(e.amount);
    byUnit[key].count++;
  });

  // Group by source
  const bySource: Record<string, number> = {};
  entries.forEach(e => { bySource[e.source || 'Other'] = (bySource[e.source || 'Other'] || 0) + Number(e.amount); });

  const maxByUnit = Math.max(1, ...Object.values(byUnit).map(v => v.total));

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>💰 Revenue</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 4 }}>Track income across all GWDS business units</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="modal-select" style={{ width: 'auto' }} value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
            <option value="">All Units</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>+ Add Entry</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Entries</div>
          <div className="stat-value">{entries.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sources</div>
          <div className="stat-value">{sources.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Business Units</div>
          <div className="stat-value">{Object.keys(byUnit).length}</div>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>New Revenue Entry</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input className="modal-input" placeholder="Amount" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <select className="modal-select" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="USDC">USDC</option><option value="ETH">ETH</option><option value="SOL">SOL</option>
            </select>
            <input className="modal-input" placeholder="Source (e.g., TikTok, Trading)" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
            <input className="modal-input" type="date" value={form.recorded_at} onChange={e => setForm({ ...form, recorded_at: e.target.value })} />
            <input className="modal-input" placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ gridColumn: 'span 2' }} />
            <select className="modal-select" value={form.business_unit_id} onChange={e => setForm({ ...form, business_unit_id: e.target.value })}>
              <option value="">No unit</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={create}>Save</button>
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* By Unit breakdown */}
      {Object.keys(byUnit).length > 0 && (
        <>
          <div className="section-heading">By Business Unit</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginBottom: 28 }}>
            {Object.entries(byUnit).map(([key, v]) => (
              <div key={key} className="ops-mission-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{v.icon} {v.name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--green)' }}>${v.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>{v.count} entries</div>
                <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${(v.total / maxByUnit) * 100}%`, background: 'var(--green)', borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* By Source breakdown */}
      {Object.keys(bySource).length > 0 && (
        <>
          <div className="section-heading">By Source</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
            {Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([source, total]) => (
              <div key={source} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{source}</span>
                <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.88rem' }}>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Entries table / cards */}
      <div className="section-heading">All Entries</div>
      {entries.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-tertiary)' }}>No revenue entries yet. Click &quot;+ Add Entry&quot; to start tracking.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map(e => {
            const u = units.find(u => u.id === e.business_unit_id);
            return (
              <div key={e.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{e.source}</div>
                  {e.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{e.description}</div>}
                </div>
                {u && <span className="badge badge-notes" style={{ fontSize: '0.72rem' }}>{u.icon} {u.name}</span>}
                <span style={{ fontWeight: 600, color: Number(e.amount) >= 0 ? 'var(--green)' : 'var(--rose)', fontSize: '0.92rem' }}>
                  {Number(e.amount) >= 0 ? '+' : ''}{Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {e.currency}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', minWidth: 80, textAlign: 'right' }}>
                  {new Date(e.recorded_at).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
