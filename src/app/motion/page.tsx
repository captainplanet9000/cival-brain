'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  total: number;
  queued: number;
  rendering: number;
  rendered: number;
  prompts: number;
}

interface QueueItem {
  id: string;
  project_id: string;
  status: string;
  priority: number;
  created_at: string;
  started_at: string | null;
  projects: {
    title: string;
  };
}

interface Project {
  id: string;
  title: string;
  status: string;
  duration: number;
  created_at: string;
}

const StatusBadge = ({status}: {status:string}) => {
  const colors: Record<string,{bg:string,text:string}> = {
    draft: {bg:'oklch(0.22 0.014 260)',text:'oklch(0.50 0.015 260)'},
    queued: {bg:'oklch(0.25 0.06 75)',text:'oklch(0.75 0.15 75)'},
    rendering: {bg:'oklch(0.25 0.06 250)',text:'oklch(0.65 0.18 250)'},
    rendered: {bg:'oklch(0.25 0.06 155)',text:'oklch(0.65 0.18 155)'},
    failed: {bg:'oklch(0.25 0.06 25)',text:'oklch(0.65 0.2 25)'},
  };
  const c = colors[status] || colors.draft;
  const isPulsing = status === 'rendering';
  
  return (
    <span style={{
      padding:'3px 10px',
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

export default function MotionDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/motion/stats').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/motion/queue').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/motion?limit=9').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([s, q, p]) => {
      setStats(s || {total:0,queued:0,rendering:0,rendered:0,prompts:0});
      setQueue(Array.isArray(q) ? q : []);
      setProjects(Array.isArray(p) ? p : []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{padding:40,color:'oklch(0.65 0.02 260)'}}>Loading Motion Graphics Studio...</div>;
  }

  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:'1.5rem',fontWeight:700,marginBottom:4}}>🎬 Motion Graphics Studio</h1>
          <p style={{color:'oklch(0.65 0.02 260)',fontSize:'0.85rem'}}>Programmatic video generation & management</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:12,marginBottom:24}}>
        <StatCard label="Total Projects" value={stats?.total || 0} />
        <StatCard label="Queued/Rendering" value={(stats?.queued || 0) + (stats?.rendering || 0)} color="oklch(0.75 0.15 75)" />
        <StatCard label="Rendered Videos" value={stats?.rendered || 0} color="oklch(0.65 0.18 155)" />
        <StatCard label="Prompt Library" value={stats?.prompts || 0} color="oklch(0.65 0.18 300)" />
      </div>

      {/* Active Queue */}
      {queue.length > 0 && (
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:12}}>Active Queue</h2>
          <div style={{background:'oklch(0.17 0.015 260)',border:'1px solid oklch(0.28 0.015 260)',borderRadius:12,overflow:'hidden'}}>
            {queue.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display:'flex',
                  alignItems:'center',
                  gap:12,
                  padding:'12px 16px',
                  borderBottom: i < queue.length - 1 ? '1px solid oklch(0.28 0.015 260)' : 'none',
                }}
              >
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {item.projects?.title || 'Untitled'}
                  </div>
                  <div style={{fontSize:'0.78rem',color:'oklch(0.50 0.015 260)'}}>
                    Priority: {item.priority} • {item.started_at ? 'Started' : 'Waiting'}
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <h2 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:12}}>Recent Projects</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:12,marginBottom:24}}>
        {projects.length === 0 ? (
          <div style={{
            background:'oklch(0.17 0.015 260)',
            border:'1px solid oklch(0.28 0.015 260)',
            borderRadius:12,
            padding:24,
            textAlign:'center',
            color:'oklch(0.50 0.015 260)',
            gridColumn:'1 / -1'
          }}>
            No projects yet. Create your first project to get started!
          </div>
        ) : projects.map(p => (
          <Link
            key={p.id}
            href={`/motion/projects/${p.id}`}
            style={{
              background:'oklch(0.17 0.015 260)',
              border:'1px solid oklch(0.28 0.015 260)',
              borderRadius:12,
              padding:16,
              textDecoration:'none',
              color:'inherit',
              transition:'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'oklch(0.19 0.02 260)';
              e.currentTarget.style.borderColor = 'oklch(0.35 0.02 260)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'oklch(0.17 0.015 260)';
              e.currentTarget.style.borderColor = 'oklch(0.28 0.015 260)';
            }}
          >
            <div style={{fontWeight:600,fontSize:'0.95rem',marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {p.title}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <StatusBadge status={p.status} />
              <span style={{fontSize:'0.75rem',color:'oklch(0.50 0.015 260)'}}>{p.duration}s</span>
            </div>
            <div style={{fontSize:'0.72rem',color:'oklch(0.50 0.015 260)'}}>
              {new Date(p.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:12}}>Quick Actions</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:12}}>
        <ActionCard
          href="/motion/create"
          icon="⚡"
          title="New Project"
          description="Create a new motion graphics video"
          color="oklch(0.65 0.18 250)"
        />
        <ActionCard
          href="/motion/prompts"
          icon="📚"
          title="Prompt Library"
          description="Browse and manage video prompts"
          color="oklch(0.65 0.18 300)"
        />
        <ActionCard
          href="/motion/audio"
          icon="🎵"
          title="Audio Library"
          description="Generate and manage audio tracks"
          color="oklch(0.65 0.18 155)"
        />
        <ActionCard
          href="/motion/library"
          icon="🎬"
          title="Video Library"
          description="View all rendered videos"
          color="oklch(0.75 0.15 75)"
        />
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

function ActionCard({ href, icon, title, description, color }: { href: string; icon: string; title: string; description: string; color: string }) {
  return (
    <Link
      href={href}
      style={{
        background:'oklch(0.17 0.015 260)',
        border:'1px solid oklch(0.28 0.015 260)',
        borderRadius:12,
        padding:20,
        textDecoration:'none',
        color:'inherit',
        display:'flex',
        flexDirection:'column',
        gap:8,
        transition:'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'oklch(0.19 0.02 260)';
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'oklch(0.17 0.015 260)';
        e.currentTarget.style.borderColor = 'oklch(0.28 0.015 260)';
      }}
    >
      <div style={{fontSize:32}}>{icon}</div>
      <div style={{fontWeight:600,fontSize:'1rem',color}}>{title}</div>
      <div style={{fontSize:'0.82rem',color:'oklch(0.65 0.02 260)',lineHeight:1.4}}>{description}</div>
    </Link>
  );
}
