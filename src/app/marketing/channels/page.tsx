'use client';
import { useEffect, useState } from 'react';

interface Channel {
  id: string; name: string; platform: string; handle: string;
  business_unit_id: string | null; status: string; followers: number;
  profile_url: string; api_connected: boolean;
  ops_business_units: { name: string } | null;
}
interface BU { id: string; name: string; }

const platformIcons: Record<string, string> = { tiktok: '🎵', twitter: '🐦', instagram: '📸', youtube: '🎬', facebook: '📘', linkedin: '💼' };
const platformColors: Record<string, string> = { tiktok: 'var(--rose)', twitter: 'var(--accent)', instagram: 'var(--purple)', youtube: 'var(--rose)', facebook: 'var(--accent)' };

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [bus, setBus] = useState<BU[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', platform: 'tiktok', handle: '', business_unit_id: '', followers: 0 });

  const load = () => fetch('/api/marketing/channels').then(r => r.json()).then(d => setChannels(Array.isArray(d) ? d : []));
  useEffect(() => { load(); fetch('/api/ops/business-units').then(r => r.json()).then(d => setBus(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  const submit = async () => {
    await fetch('/api/marketing/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, business_unit_id: form.business_unit_id || null, followers: Number(form.followers) }),
    });
    setShowForm(false);
    setForm({ name: '', platform: 'tiktok', handle: '', business_unit_id: '', followers: 0 });
    load();
  };

  const detailChannel = channels.find(c => c.id === detail);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>📡 Channels</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Manage your social media accounts</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Channel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {channels.map(ch => (
          <div key={ch.id} onClick={() => setDetail(detail === ch.id ? null : ch.id)} style={{
            background: detail === ch.id ? 'var(--bg-elevated)' : 'var(--bg-surface)',
            border: detail === ch.id ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', padding: 18, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: '1.6rem' }}>{platformIcons[ch.platform] || '📱'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{ch.name}</div>
                <div style={{ fontSize: '0.78rem', color: platformColors[ch.platform] || 'var(--text-tertiary)' }}>{ch.handle}</div>
              </div>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: ch.status === 'active' ? 'var(--green)' : ch.status === 'paused' ? 'var(--amber)' : 'var(--text-tertiary)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              <span>{ch.ops_business_units?.name || 'Unassigned'}</span>
              <span>{ch.followers.toLocaleString()} followers</span>
            </div>
            {ch.api_connected && <div style={{ fontSize: '0.72rem', color: 'var(--green)', marginTop: 6 }}>🔗 API Connected</div>}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {detailChannel && (
        <div style={{ marginTop: 20, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: '2rem' }}>{platformIcons[detailChannel.platform]}</span>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{detailChannel.name}</h2>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{detailChannel.handle} · {detailChannel.platform}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Followers</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{detailChannel.followers.toLocaleString()}</div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: detailChannel.status === 'active' ? 'var(--green)' : 'var(--amber)', textTransform: 'capitalize' }}>{detailChannel.status}</div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Business Unit</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 500 }}>{detailChannel.ops_business_units?.name || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Channel Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 28, width: 440, maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Add Channel</h2>
            <label className="modal-label">Name</label>
            <input className="modal-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="modal-label">Platform</label>
                <select className="modal-select" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                  {['tiktok', 'twitter', 'instagram', 'youtube', 'facebook', 'linkedin'].map(p => <option key={p} value={p}>{platformIcons[p]} {p}</option>)}
                </select></div>
              <div><label className="modal-label">Handle</label>
                <input className="modal-input" value={form.handle} onChange={e => setForm({ ...form, handle: e.target.value })} placeholder="@username" /></div>
            </div>
            <label className="modal-label">Business Unit</label>
            <select className="modal-select" value={form.business_unit_id} onChange={e => setForm({ ...form, business_unit_id: e.target.value })}>
              <option value="">None</option>
              {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <label className="modal-label">Followers</label>
            <input className="modal-input" type="number" value={form.followers} onChange={e => setForm({ ...form, followers: Number(e.target.value) })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit} disabled={!form.name}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
