'use client';

export default function RevenuePage() {
  const categories = [
    { label: 'Trading P&L', icon: '📊', value: '$—', change: '—', color: 'var(--green)' },
    { label: 'Content Earnings', icon: '🎬', value: '$—', change: '—', color: 'var(--accent)' },
    { label: 'NFT Revenue', icon: '🎨', value: '$—', change: '—', color: 'var(--purple)' },
    { label: 'Subscriptions', icon: '🏆', value: '$—', change: '—', color: 'var(--amber)' },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <div className="dash-hero">
        <h1>💰 Revenue</h1>
        <p>Track income across all GWDS business units</p>
      </div>

      <div className="stats-grid">
        {categories.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-label">{c.icon} {c.label}</div>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{c.change}</div>
          </div>
        ))}
      </div>

      <div className="section-heading">Revenue Streams</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
        {['Cival Dashboard', 'Honey Bunny', 'Clay Verse', 'GWDS TikTok', 'The 400 Club', 'Hunni Bunni Kitchen'].map(name => (
          <div key={name} className="ops-mission-card">
            <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Revenue</span>
              <span style={{ color: 'var(--text-tertiary)' }}>$—</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, marginTop: 8 }}>
              <div style={{ height: '100%', width: '0%', background: 'var(--accent)', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px 0', fontSize: '0.88rem' }}>
        <p>🚧 Revenue tracking coming soon</p>
        <p style={{ fontSize: '0.78rem', marginTop: 4 }}>Connect trading APIs, TikTok analytics, and payment processors to see live data</p>
      </div>
    </div>
  );
}
