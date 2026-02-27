'use client';

import { useEffect, useState } from 'react';

const MC_API = 'http://localhost:8000';
const MC_UI = 'http://localhost:3100';
const MC_TOKEN = '9iuJfzfFe6smzx0OADRkf44nvs2JhWGp+YtYqZVHo8pGIj3PoSaIuShAdGLHZZCn';

interface Board { id: string; name: string; description: string; created_at: string; task_count?: number; }
interface Agent { id: string; name: string; role: string; status: string; created_at: string; }
interface Activity { id: string; kind: string; summary: string; actor: string; created_at: string; }
interface Gateway { id: string; name: string; status: string; last_seen: string; version: string; }
interface Approval { id: string; title: string; status: string; requested_by: string; created_at: string; }

const headers = { 'Authorization': `Bearer ${MC_TOKEN}`, 'Content-Type': 'application/json' };

async function mcFetch(path: string) {
  try {
    const r = await fetch(`${MC_API}${path}`, { headers });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

export default function MissionControlPage() {
  const [health, setHealth] = useState<boolean | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'boards' | 'agents' | 'activity' | 'gateways' | 'approvals'>('overview');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [h, b, ag, act, gw, ap] = await Promise.all([
      mcFetch('/healthz'),
      mcFetch('/api/v1/boards?page=1&size=50'),
      mcFetch('/api/v1/agents?page=1&size=50'),
      mcFetch('/api/v1/activity?page=1&size=20'),
      mcFetch('/api/v1/gateways?page=1&size=20'),
      mcFetch('/api/v1/approvals?page=1&size=20'),
    ]);
    setHealth(h?.ok ?? false);
    setBoards(b?.items || []);
    setAgents(ag?.items || []);
    setActivity(act?.items || []);
    setGateways(gw?.items || []);
    setApprovals(ap?.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: '📊' },
    { key: 'boards' as const, label: 'Boards', icon: '📋' },
    { key: 'agents' as const, label: 'Agents', icon: '🤖' },
    { key: 'activity' as const, label: 'Activity', icon: '📡' },
    { key: 'gateways' as const, label: 'Gateways', icon: '🔌' },
    { key: 'approvals' as const, label: `Approvals${pendingApprovals.length ? ` (${pendingApprovals.length})` : ''}`, icon: '✅' },
  ];

  const fmtTime = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      online: 'var(--green)', active: 'var(--green)', connected: 'var(--green)',
      offline: 'var(--text-tertiary)', inactive: 'var(--text-tertiary)',
      pending: 'var(--amber)', approved: 'var(--green)', rejected: 'var(--rose)',
    };
    return (
      <span style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: colors[status] || 'var(--text-tertiary)', marginRight: 6,
      }} />
    );
  };

  return (
    <div className="page-container" style={{ maxWidth: 1200 }}>
      <div className="dash-hero">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>🛡️ Mission Control</h1>
            <p>Agent orchestration, governance & operational visibility</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{
              fontSize: '0.78rem', fontWeight: 500,
              color: health ? 'var(--green)' : health === false ? 'var(--rose)' : 'var(--text-tertiary)',
            }}>
              ● {health ? 'Connected' : health === false ? 'Offline' : 'Checking...'}
            </span>
            <a href={MC_UI} target="_blank" rel="noopener noreferrer" style={{
              fontSize: '0.78rem', padding: '5px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', color: 'white', textDecoration: 'none', fontWeight: 500,
            }}>Open Full UI →</a>
            <button onClick={load} style={{
              fontSize: '0.78rem', padding: '5px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}>↻ Refresh</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none',
            background: activeTab === t.key ? 'var(--accent)' : 'var(--bg-surface)',
            color: activeTab === t.key ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.84rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>Loading Mission Control data...</div>}

      {!loading && activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-label">📋 Boards</div><div className="stat-value">{boards.length}</div></div>
            <div className="stat-card"><div className="stat-label">🤖 Agents</div><div className="stat-value">{agents.length}</div></div>
            <div className="stat-card"><div className="stat-label">🔌 Gateways</div><div className="stat-value">{gateways.length}</div></div>
            <div className="stat-card"><div className="stat-label">✅ Pending</div><div className="stat-value" style={{ color: pendingApprovals.length > 0 ? 'var(--amber)' : 'var(--green)' }}>{pendingApprovals.length}</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }} className="ops-grid">
            <div>
              <div className="section-heading">Recent Activity</div>
              <div className="ops-feed">
                {activity.slice(0, 8).map(a => (
                  <div key={a.id} className="ops-feed-item">
                    <div className="ops-feed-dot" style={{ background: 'var(--accent)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ops-feed-title">{a.summary || a.kind}</div>
                      <div className="ops-feed-meta">
                        <span className="badge badge-notes">{a.actor}</span>
                        <span>{a.kind}</span>
                        <span>{fmtTime(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && <div style={{ color: 'var(--text-tertiary)', padding: 16, fontSize: '0.85rem' }}>No activity yet — connect your gateway to start tracking</div>}
              </div>
            </div>

            <div>
              {pendingApprovals.length > 0 && (
                <>
                  <div className="section-heading">⚠️ Pending Approvals</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    {pendingApprovals.map(a => (
                      <div key={a.id} className="ops-mission-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{a.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{a.requested_by} · {fmtTime(a.created_at)}</div>
                          </div>
                          <span className="badge badge-notes">pending</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <a href={`${MC_UI}/approvals`} target="_blank" rel="noopener noreferrer" style={{
                            fontSize: '0.75rem', padding: '3px 10px', borderRadius: 'var(--radius-md)',
                            background: 'var(--green-subtle)', color: 'var(--green)', textDecoration: 'none', fontWeight: 500,
                          }}>Review in Mission Control →</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="section-heading">Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href={`${MC_UI}/boards`} target="_blank" rel="noopener noreferrer" className="ops-mission-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>📋</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Manage Boards</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Create boards, assign tasks, organize work</div>
                  </div>
                </a>
                <a href={`${MC_UI}/agents`} target="_blank" rel="noopener noreferrer" className="ops-mission-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Agent Lifecycle</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Create, inspect, manage agents</div>
                  </div>
                </a>
                <a href={`${MC_UI}/gateways`} target="_blank" rel="noopener noreferrer" className="ops-mission-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>🔌</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Gateway Management</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Connect OpenClaw gateways</div>
                  </div>
                </a>
                <a href={`${MC_UI}/approvals`} target="_blank" rel="noopener noreferrer" className="ops-mission-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Approval Flows</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Human-in-the-loop governance</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && activeTab === 'boards' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-heading" style={{ margin: 0 }}>Kanban Boards</div>
            <a href={`${MC_UI}/boards/new`} target="_blank" rel="noopener noreferrer" style={{
              fontSize: '0.78rem', padding: '5px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', color: 'white', textDecoration: 'none', fontWeight: 500,
            }}>+ New Board</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {boards.map(b => (
              <a key={b.id} href={`${MC_UI}/boards/${b.id}`} target="_blank" rel="noopener noreferrer" className="ops-mission-card" style={{ textDecoration: 'none' }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: 4 }}>{b.name}</div>
                {b.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>{b.description}</div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Created {fmtTime(b.created_at)}</div>
              </a>
            ))}
            {boards.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>
                <p style={{ marginBottom: 12 }}>No boards yet</p>
                <a href={`${MC_UI}/boards/new`} target="_blank" rel="noopener noreferrer" style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-md)', background: 'var(--accent)',
                  color: 'white', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem',
                }}>Create your first board →</a>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && activeTab === 'agents' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-heading" style={{ margin: 0 }}>Agents</div>
            <a href={`${MC_UI}/agents/new`} target="_blank" rel="noopener noreferrer" style={{
              fontSize: '0.78rem', padding: '5px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', color: 'white', textDecoration: 'none', fontWeight: 500,
            }}>+ New Agent</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {agents.map(a => (
              <a key={a.id} href={`${MC_UI}/agents/${a.id}`} target="_blank" rel="noopener noreferrer" className="ops-agent-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{a.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{a.role || 'No role set'}</div>
                </div>
                <span>{statusDot(a.status)}{a.status}</span>
              </a>
            ))}
            {agents.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>
                <p style={{ marginBottom: 12 }}>No agents registered</p>
                <a href={`${MC_UI}/agents/new`} target="_blank" rel="noopener noreferrer" style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-md)', background: 'var(--accent)',
                  color: 'white', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem',
                }}>Register an agent →</a>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && activeTab === 'activity' && (
        <>
          <div className="section-heading">Activity Timeline</div>
          <div className="ops-feed">
            {activity.map(a => (
              <div key={a.id} className="ops-feed-item">
                <div className="ops-feed-dot" style={{ background: 'var(--accent)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ops-feed-title">{a.summary || a.kind}</div>
                  <div className="ops-feed-meta">
                    <span className="badge badge-notes">{a.actor}</span>
                    <span>{a.kind}</span>
                    <span>{fmtTime(a.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
            {activity.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>No activity recorded yet</div>}
          </div>
        </>
      )}

      {!loading && activeTab === 'gateways' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-heading" style={{ margin: 0 }}>Gateways</div>
            <a href={`${MC_UI}/gateways/new`} target="_blank" rel="noopener noreferrer" style={{
              fontSize: '0.78rem', padding: '5px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', color: 'white', textDecoration: 'none', fontWeight: 500,
            }}>+ Connect Gateway</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {gateways.map(g => (
              <a key={g.id} href={`${MC_UI}/gateways/${g.id}`} target="_blank" rel="noopener noreferrer" className="ops-mission-card" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{g.name}</div>
                  <span>{statusDot(g.status)}{g.status}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {g.version && `v${g.version} · `}Last seen {fmtTime(g.last_seen)}
                </div>
              </a>
            ))}
            {gateways.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>
                <p style={{ marginBottom: 8 }}>No gateways connected</p>
                <p style={{ fontSize: '0.82rem', marginBottom: 12 }}>Connect your OpenClaw gateway to enable distributed orchestration</p>
                <a href={`${MC_UI}/gateways/new`} target="_blank" rel="noopener noreferrer" style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-md)', background: 'var(--accent)',
                  color: 'white', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem',
                }}>Connect Gateway →</a>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && activeTab === 'approvals' && (
        <>
          <div className="section-heading">Approval Queue</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {approvals.map(a => (
              <div key={a.id} className="ops-mission-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{a.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{a.requested_by} · {fmtTime(a.created_at)}</div>
                  </div>
                  <span className={`badge ${a.status === 'pending' ? 'badge-notes' : a.status === 'approved' ? 'badge-areas' : 'badge-archive'}`}>
                    {statusDot(a.status)}{a.status}
                  </span>
                </div>
                {a.status === 'pending' && (
                  <div style={{ marginTop: 8 }}>
                    <a href={`${MC_UI}/approvals`} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: '0.78rem', padding: '4px 12px', borderRadius: 'var(--radius-md)',
                      background: 'var(--accent)', color: 'white', textDecoration: 'none', fontWeight: 500,
                    }}>Review →</a>
                  </div>
                )}
              </div>
            ))}
            {approvals.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>No approvals in queue</div>}
          </div>
        </>
      )}
    </div>
  );
}
