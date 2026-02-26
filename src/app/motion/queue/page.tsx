'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface QueueItem {
  id: string;
  project_id: string;
  status: string;
  priority: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  projects: {
    title: string;
  };
}

const StatusBadge = ({status}: {status:string}) => {
  const colors: Record<string,{bg:string,text:string}> = {
    pending: {bg:'oklch(0.22 0.014 260)',text:'oklch(0.50 0.015 260)'},
    processing: {bg:'oklch(0.25 0.06 250)',text:'oklch(0.65 0.18 250)'},
    completed: {bg:'oklch(0.25 0.06 155)',text:'oklch(0.65 0.18 155)'},
    failed: {bg:'oklch(0.25 0.06 25)',text:'oklch(0.65 0.2 25)'},
  };
  const c = colors[status] || colors.pending;
  const isPulsing = status === 'processing';
  
  return (
    <span style={{
      padding:'4px 12px',
      borderRadius:20,
      fontSize:'0.75rem',
      fontWeight:600,
      background:c.bg,
      color:c.text,
      display:'inline-block',
      animation: isPulsing ? 'pulse 2s ease-in-out infinite' : 'none'
    }}>
      {status}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </span>
  );
};

function formatRelativeTime(date: string): string {
  const now = new Date().getTime();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function QueueMonitor() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  const loadQueue = async () => {
    const res = await fetch('/api/motion/queue').catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setQueue(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const processNext = async () => {
    setProcessing(true);
    await fetch('/api/motion/queue/process', { method: 'POST' });
    loadQueue();
    setProcessing(false);
  };

  const cancelItem = async (id: string) => {
    if (!confirm('Cancel this queue item?')) return;
    await fetch(`/api/motion/queue/${id}`, { method: 'DELETE' });
    loadQueue();
  };

  const retryItem = async (item: QueueItem) => {
    await fetch('/api/motion/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: item.project_id }),
    });
    loadQueue();
  };

  const pending = queue.filter(q => q.status === 'pending');
  const processing_items = queue.filter(q => q.status === 'processing');
  const completed = queue.filter(q => q.status === 'completed');
  const failed = queue.filter(q => q.status === 'failed');

  const currentItems = activeTab === 'pending' ? pending : activeTab === 'processing' ? processing_items : activeTab === 'completed' ? completed : failed;

  if (loading) {
    return <div style={{padding:40,color:'oklch(0.65 0.02 260)'}}>Loading queue...</div>;
  }

  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:'1.3rem',fontWeight:700}}>⚙️ Render Queue</h1>
          <p style={{color:'oklch(0.50 0.015 260)',fontSize:'0.82rem'}}>Auto-refresh every 5 seconds</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button
            onClick={processNext}
            disabled={processing || pending.length === 0}
            style={{
              ...btnPrimary,
              opacity: processing || pending.length === 0 ? 0.6 : 1,
            }}
          >
            {processing ? '⏳ Processing...' : '▶️ Process Next'}
          </button>
          <Link href="/motion" style={{...btnSecondary,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:12,marginBottom:24}}>
        <StatCard label="Pending" value={pending.length} color="oklch(0.50 0.015 260)" />
        <StatCard label="Processing" value={processing_items.length} color="oklch(0.65 0.18 250)" />
        <StatCard label="Completed" value={completed.length} color="oklch(0.65 0.18 155)" />
        <StatCard label="Failed" value={failed.length} color="oklch(0.65 0.2 25)" />
      </div>

      {/* Status Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
        {[
          { key: 'pending', label: 'Pending', count: pending.length },
          { key: 'processing', label: 'Processing', count: processing_items.length },
          { key: 'completed', label: 'Completed', count: completed.length },
          { key: 'failed', label: 'Failed', count: failed.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding:'8px 16px',
              borderRadius:8,
              fontSize:'0.82rem',
              fontWeight:600,
              background: activeTab === tab.key ? 'oklch(0.65 0.18 250)' : 'oklch(0.17 0.015 260)',
              color: activeTab === tab.key ? 'white' : 'oklch(0.65 0.02 260)',
              border:'1px solid oklch(0.28 0.015 260)',
              cursor:'pointer',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Queue Items */}
      <div style={{background:'oklch(0.17 0.015 260)',border:'1px solid oklch(0.28 0.015 260)',borderRadius:12,overflow:'hidden'}}>
        {currentItems.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:'oklch(0.50 0.015 260)'}}>
            No items in {activeTab} status
          </div>
        ) : currentItems.map((item, i) => (
          <div
            key={item.id}
            style={{
              padding:'16px 20px',
              borderBottom: i < currentItems.length - 1 ? '1px solid oklch(0.28 0.015 260)' : 'none',
            }}
          >
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:16,marginBottom:8}}>
              <div style={{flex:1,minWidth:0}}>
                <Link
                  href={`/motion/projects/${item.project_id}`}
                  style={{
                    fontWeight:600,
                    fontSize:'0.95rem',
                    color:'oklch(0.65 0.18 250)',
                    textDecoration:'none',
                    display:'block',
                    marginBottom:6,
                  }}
                >
                  {item.projects?.title || 'Untitled Project'}
                </Link>
                <div style={{fontSize:'0.75rem',color:'oklch(0.50 0.015 260)',display:'flex',gap:12,flexWrap:'wrap'}}>
                  <span>Priority: {item.priority}</span>
                  <span>•</span>
                  <span>Queued {formatRelativeTime(item.created_at)}</span>
                  {item.started_at && (
                    <>
                      <span>•</span>
                      <span>Started {formatRelativeTime(item.started_at)}</span>
                    </>
                  )}
                  {item.completed_at && (
                    <>
                      <span>•</span>
                      <span>Completed {formatRelativeTime(item.completed_at)}</span>
                    </>
                  )}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                <StatusBadge status={item.status} />
                {item.status === 'pending' && (
                  <button
                    onClick={() => cancelItem(item.id)}
                    style={smallBtn}
                  >
                    ❌ Cancel
                  </button>
                )}
                {item.status === 'failed' && (
                  <button
                    onClick={() => retryItem(item)}
                    style={smallBtn}
                  >
                    🔄 Retry
                  </button>
                )}
              </div>
            </div>
            
            {item.error_message && (
              <div style={{
                marginTop:8,
                padding:'8px 12px',
                background:'oklch(0.25 0.06 25)',
                border:'1px solid oklch(0.65 0.2 25)',
                borderRadius:8,
                fontSize:'0.75rem',
                color:'oklch(0.65 0.2 25)',
                fontFamily:'monospace',
                whiteSpace:'pre-wrap',
                wordBreak:'break-word',
              }}>
                {item.error_message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background:'oklch(0.17 0.015 260)',
      border:'1px solid oklch(0.28 0.015 260)',
      borderRadius:8,
      padding:'14px 16px',
    }}>
      <div style={{fontSize:'1.4rem',fontWeight:700,color:color || 'oklch(0.93 0.01 260)'}}>{value}</div>
      <div style={{fontSize:'0.78rem',color:'oklch(0.50 0.015 260)'}}>{label}</div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding:'10px 20px',
  borderRadius:8,
  fontSize:'0.88rem',
  fontWeight:600,
  background:'oklch(0.65 0.18 250)',
  color:'white',
  border:'none',
  cursor:'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding:'10px 20px',
  borderRadius:8,
  fontSize:'0.88rem',
  fontWeight:500,
  background:'oklch(0.19 0.02 260)',
  color:'oklch(0.93 0.01 260)',
  border:'1px solid oklch(0.28 0.015 260)',
  cursor:'pointer',
};

const smallBtn: React.CSSProperties = {
  padding:'4px 10px',
  borderRadius:6,
  fontSize:'0.72rem',
  fontWeight:600,
  background:'oklch(0.19 0.02 260)',
  color:'oklch(0.93 0.01 260)',
  border:'1px solid oklch(0.28 0.015 260)',
  cursor:'pointer',
};
