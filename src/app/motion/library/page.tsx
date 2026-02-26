'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  status: string;
  duration: number;
  resolution: string;
  file_size: number | null;
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
  return <span style={{padding:'3px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:600,background:c.bg,color:c.text}}>{status}</span>;
};

export default function VideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadVideos = async () => {
    const url = statusFilter ? `/api/motion?status=${statusFilter}` : '/api/motion';
    const res = await fetch(url).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVideos();
  }, [statusFilter]);

  const deleteVideo = async (id: string) => {
    if (!confirm('Delete this video project?')) return;
    setDeleting(id);
    await fetch(`/api/motion/${id}`, { method: 'DELETE' });
    loadVideos();
    setDeleting(null);
  };

  const downloadVideo = async (id: string, title: string) => {
    const res = await fetch(`/api/motion/${id}/download`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const filteredVideos = videos.filter(v => {
    if (!statusFilter) return true;
    return v.status === statusFilter;
  });

  if (loading) {
    return <div style={{padding:40,color:'oklch(0.65 0.02 260)'}}>Loading videos...</div>;
  }

  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:'1.3rem',fontWeight:700}}>🎬 Video Library ({filteredVideos.length})</h1>
          <p style={{color:'oklch(0.50 0.015 260)',fontSize:'0.82rem'}}>All motion graphics projects</p>
        </div>
        <Link href="/motion" style={{...btnSecondary,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>← Dashboard</Link>
      </div>

      {/* Status Filter Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:24,flexWrap:'wrap'}}>
        {['All', 'Rendered', 'Rendering', 'Failed'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status === 'All' ? '' : status.toLowerCase())}
            style={{
              padding:'8px 16px',
              borderRadius:8,
              fontSize:'0.82rem',
              fontWeight:600,
              background: (status === 'All' && !statusFilter) || statusFilter === status.toLowerCase() ? 'oklch(0.65 0.18 250)' : 'oklch(0.17 0.015 260)',
              color: (status === 'All' && !statusFilter) || statusFilter === status.toLowerCase() ? 'white' : 'oklch(0.65 0.02 260)',
              border:'1px solid oklch(0.28 0.015 260)',
              cursor:'pointer',
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div style={{
          padding:60,
          textAlign:'center',
          background:'oklch(0.17 0.015 260)',
          border:'1px solid oklch(0.28 0.015 260)',
          borderRadius:12,
        }}>
          <div style={{fontSize:64,marginBottom:16}}>🎬</div>
          <h2 style={{fontSize:'1.2rem',fontWeight:600,marginBottom:8}}>No videos yet</h2>
          <p style={{color:'oklch(0.50 0.015 260)',marginBottom:24}}>Create your first project to get started!</p>
          <Link
            href="/motion/create"
            style={{
              ...btnPrimary,
              textDecoration:'none',
              display:'inline-flex',
              alignItems:'center',
            }}
          >
            ⚡ Create Project
          </Link>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',gap:16}}>
          {filteredVideos.map(v => (
            <div
              key={v.id}
              style={{
                background:'oklch(0.17 0.015 260)',
                border:'1px solid oklch(0.28 0.015 260)',
                borderRadius:12,
                overflow:'hidden',
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
              {/* Thumbnail/Icon */}
              <div
                style={{
                  height:180,
                  background:'linear-gradient(135deg, oklch(0.13 0.01 260), oklch(0.16 0.015 270))',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  fontSize:64,
                  borderBottom:'1px solid oklch(0.28 0.015 260)',
                }}
              >
                🎬
              </div>
              
              {/* Content */}
              <div style={{padding:16}}>
                <div style={{fontWeight:600,fontSize:'0.95rem',marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {v.title}
                </div>
                
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <StatusBadge status={v.status} />
                  <span style={{fontSize:'0.75rem',color:'oklch(0.50 0.015 260)'}}>
                    {v.duration}s • {v.resolution}
                  </span>
                </div>
                
                {v.file_size && (
                  <div style={{fontSize:'0.75rem',color:'oklch(0.50 0.015 260)',marginBottom:8}}>
                    {(v.file_size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                )}
                
                <div style={{fontSize:'0.72rem',color:'oklch(0.50 0.015 260)',marginBottom:12}}>
                  {new Date(v.created_at).toLocaleDateString()}
                </div>
                
                {/* Action Buttons */}
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  <Link
                    href={`/motion/projects/${v.id}`}
                    style={{
                      ...smallBtn,
                      background:'oklch(0.65 0.18 250)',
                      color:'white',
                      textDecoration:'none',
                      flex:1,
                      textAlign:'center',
                    }}
                  >
                    👁️ View
                  </Link>
                  {v.status === 'rendered' && (
                    <button
                      onClick={() => downloadVideo(v.id, v.title)}
                      style={{
                        ...smallBtn,
                        background:'oklch(0.65 0.18 155)',
                        color:'white',
                        flex:1,
                      }}
                    >
                      ⬇️ Download
                    </button>
                  )}
                  <button
                    onClick={() => deleteVideo(v.id)}
                    disabled={deleting === v.id}
                    style={{
                      ...smallBtn,
                      background:'oklch(0.65 0.2 25)',
                      color:'white',
                      opacity: deleting === v.id ? 0.6 : 1,
                    }}
                  >
                    {deleting === v.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  padding:'6px 12px',
  borderRadius:6,
  fontSize:'0.75rem',
  fontWeight:600,
  border:'none',
  cursor:'pointer',
};
