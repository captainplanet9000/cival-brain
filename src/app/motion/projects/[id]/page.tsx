'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  prompt: string;
  description: string | null;
  status: string;
  duration: number;
  resolution: string;
  fps: number;
  brand_config: any;
  audio_track: string | null;
  created_at: string;
  updated_at: string;
  file_path: string | null;
  error_message: string | null;
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
      padding:'4px 12px',
      borderRadius:20,
      fontSize:'0.85rem',
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

export default function ProjectDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProject = async () => {
    const res = await fetch(`/api/motion/${id}`).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setProject(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  useEffect(() => {
    if (project && (project.status === 'queued' || project.status === 'rendering')) {
      const interval = setInterval(() => {
        loadProject();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [project?.status]);

  const queueRender = async () => {
    setQueueing(true);
    await fetch('/api/motion/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: id }),
    });
    loadProject();
    setQueueing(false);
  };

  const retryRender = async () => {
    setQueueing(true);
    await fetch(`/api/motion/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    });
    await queueRender();
    setQueueing(false);
  };

  const deleteProject = async () => {
    if (!confirm('Delete this project permanently?')) return;
    setDeleting(true);
    await fetch(`/api/motion/${id}`, { method: 'DELETE' });
    router.push('/motion');
  };

  const downloadVideo = async () => {
    if (!project) return;
    const res = await fetch(`/api/motion/${id}/download`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return <div style={{padding:40,color:'oklch(0.65 0.02 260)'}}>Loading project...</div>;
  }

  if (!project) {
    return (
      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>
        <div style={{textAlign:'center',padding:60}}>
          <div style={{fontSize:64,marginBottom:16}}>❌</div>
          <h2 style={{fontSize:'1.2rem',fontWeight:600,marginBottom:8}}>Project not found</h2>
          <Link href="/motion" style={{...btnPrimary,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{maxWidth:1000,margin:'0 auto',padding:'24px 20px'}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <Link href="/motion" style={{color:'oklch(0.65 0.02 260)',fontSize:'0.85rem',textDecoration:'none',display:'inline-block',marginBottom:12}}>
          ← Back to Dashboard
        </Link>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:16}}>
          <div>
            <h1 style={{fontSize:'1.5rem',fontWeight:700,marginBottom:8}}>{project.title}</h1>
            <StatusBadge status={project.status} />
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {project.status === 'draft' && (
              <button onClick={queueRender} disabled={queueing} style={{...btnPrimary,opacity:queueing ? 0.6 : 1}}>
                {queueing ? '⏳ Queueing...' : '⚡ Queue Render'}
              </button>
            )}
            {project.status === 'failed' && (
              <button onClick={retryRender} disabled={queueing} style={{...btnPrimary,opacity:queueing ? 0.6 : 1}}>
                {queueing ? '⏳ Retrying...' : '🔄 Retry Render'}
              </button>
            )}
            {project.status === 'rendered' && (
              <>
                <button onClick={downloadVideo} style={btnPrimary}>⬇️ Download</button>
                <button onClick={retryRender} disabled={queueing} style={{...btnSecondary,opacity:queueing ? 0.6 : 1}}>
                  🔄 Re-render
                </button>
              </>
            )}
            <Link href={`/motion/create?edit=${id}`} style={{...btnSecondary,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
              ✏️ Edit
            </Link>
            <button onClick={deleteProject} disabled={deleting} style={{...btnDanger,opacity:deleting ? 0.6 : 1}}>
              {deleting ? '⏳' : '🗑️ Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Video Player (if rendered) */}
      {project.status === 'rendered' && project.file_path && (
        <div style={{marginBottom:24}}>
          <video
            controls
            style={{
              width:'100%',
              borderRadius:12,
              background:'#000',
              border:'1px solid oklch(0.28 0.015 260)',
            }}
            src={`/api/motion/${id}/download`}
          />
        </div>
      )}

      {/* Rendering Status */}
      {(project.status === 'queued' || project.status === 'rendering') && (
        <div style={{
          marginBottom:24,
          padding:24,
          background:'oklch(0.17 0.015 260)',
          border:'1px solid oklch(0.28 0.015 260)',
          borderRadius:12,
          textAlign:'center',
        }}>
          <div style={{fontSize:48,marginBottom:12,animation:'spin 2s linear infinite'}}>⚙️</div>
          <h3 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:4}}>
            {project.status === 'queued' ? 'Queued for Rendering' : 'Rendering...'}
          </h3>
          <p style={{color:'oklch(0.65 0.02 260)',fontSize:'0.85rem'}}>This page will auto-refresh every 3 seconds</p>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Error Message (if failed) */}
      {project.status === 'failed' && project.error_message && (
        <div style={{
          marginBottom:24,
          padding:16,
          background:'oklch(0.25 0.06 25)',
          border:'1px solid oklch(0.65 0.2 25)',
          borderRadius:12,
        }}>
          <h3 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:8,color:'oklch(0.65 0.2 25)'}}>❌ Render Failed</h3>
          <pre style={{fontSize:'0.8rem',color:'oklch(0.65 0.2 25)',whiteSpace:'pre-wrap',wordBreak:'break-word',fontFamily:'monospace'}}>
            {project.error_message}
          </pre>
        </div>
      )}

      {/* Project Details */}
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        {/* Prompt */}
        <div>
          <h3 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:8,color:'oklch(0.65 0.02 260)'}}>Prompt</h3>
          <div style={{
            background:'oklch(0.17 0.015 260)',
            border:'1px solid oklch(0.28 0.015 260)',
            borderRadius:12,
            padding:16,
            fontFamily:'monospace',
            fontSize:'0.85rem',
            lineHeight:1.6,
            whiteSpace:'pre-wrap',
            wordBreak:'break-word',
          }}>
            {project.prompt}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <div>
            <h3 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:8,color:'oklch(0.65 0.02 260)'}}>Description</h3>
            <div style={{
              background:'oklch(0.17 0.015 260)',
              border:'1px solid oklch(0.28 0.015 260)',
              borderRadius:12,
              padding:16,
              fontSize:'0.85rem',
              lineHeight:1.6,
            }}>
              {project.description}
            </div>
          </div>
        )}

        {/* Settings */}
        <div>
          <h3 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:8,color:'oklch(0.65 0.02 260)'}}>Settings</h3>
          <div style={{
            background:'oklch(0.17 0.015 260)',
            border:'1px solid oklch(0.28 0.015 260)',
            borderRadius:12,
            padding:16,
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))',
            gap:12,
          }}>
            <div>
              <div style={{fontSize:'0.7rem',color:'oklch(0.50 0.015 260)',marginBottom:2}}>Duration</div>
              <div style={{fontWeight:600}}>{project.duration}s</div>
            </div>
            <div>
              <div style={{fontSize:'0.7rem',color:'oklch(0.50 0.015 260)',marginBottom:2}}>Resolution</div>
              <div style={{fontWeight:600}}>{project.resolution}</div>
            </div>
            <div>
              <div style={{fontSize:'0.7rem',color:'oklch(0.50 0.015 260)',marginBottom:2}}>FPS</div>
              <div style={{fontWeight:600}}>{project.fps}</div>
            </div>
          </div>
        </div>

        {/* Brand Config */}
        {project.brand_config && (
          <div>
            <h3 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:8,color:'oklch(0.65 0.02 260)'}}>Brand Configuration</h3>
            <div style={{
              background:'oklch(0.17 0.015 260)',
              border:'1px solid oklch(0.28 0.015 260)',
              borderRadius:12,
              padding:16,
            }}>
              {project.brand_config.company_name && (
                <div style={{marginBottom:8}}>
                  <span style={{fontSize:'0.8rem',color:'oklch(0.50 0.015 260)'}}>Company: </span>
                  <span style={{fontWeight:600}}>{project.brand_config.company_name}</span>
                </div>
              )}
              {project.brand_config.tagline && (
                <div style={{marginBottom:8}}>
                  <span style={{fontSize:'0.8rem',color:'oklch(0.50 0.015 260)'}}>Tagline: </span>
                  <span>{project.brand_config.tagline}</span>
                </div>
              )}
              <div style={{display:'flex',gap:12,marginTop:12}}>
                {project.brand_config.primary_color && (
                  <div>
                    <div style={{fontSize:'0.7rem',color:'oklch(0.50 0.015 260)',marginBottom:4}}>Primary</div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:32,height:32,borderRadius:6,background:project.brand_config.primary_color,border:'1px solid oklch(0.28 0.015 260)'}} />
                      <span style={{fontFamily:'monospace',fontSize:'0.75rem'}}>{project.brand_config.primary_color}</span>
                    </div>
                  </div>
                )}
                {project.brand_config.secondary_color && (
                  <div>
                    <div style={{fontSize:'0.7rem',color:'oklch(0.50 0.015 260)',marginBottom:4}}>Secondary</div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:32,height:32,borderRadius:6,background:project.brand_config.secondary_color,border:'1px solid oklch(0.28 0.015 260)'}} />
                      <span style={{fontFamily:'monospace',fontSize:'0.75rem'}}>{project.brand_config.secondary_color}</span>
                    </div>
                  </div>
                )}
                {project.brand_config.accent_color && (
                  <div>
                    <div style={{fontSize:'0.7rem',color:'oklch(0.50 0.015 260)',marginBottom:4}}>Accent</div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:32,height:32,borderRadius:6,background:project.brand_config.accent_color,border:'1px solid oklch(0.28 0.015 260)'}} />
                      <span style={{fontFamily:'monospace',fontSize:'0.75rem'}}>{project.brand_config.accent_color}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Audio Track */}
        {project.audio_track && (
          <div>
            <h3 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:8,color:'oklch(0.65 0.02 260)'}}>Audio Track</h3>
            <div style={{
              background:'oklch(0.17 0.015 260)',
              border:'1px solid oklch(0.28 0.015 260)',
              borderRadius:12,
              padding:16,
            }}>
              <div style={{marginBottom:8,fontWeight:600}}>{project.audio_track}</div>
              <audio controls src={`/api/motion/audio/${project.audio_track}`} style={{width:'100%',height:36}} />
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div>
          <h3 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:8,color:'oklch(0.65 0.02 260)'}}>Timestamps</h3>
          <div style={{
            background:'oklch(0.17 0.015 260)',
            border:'1px solid oklch(0.28 0.015 260)',
            borderRadius:12,
            padding:16,
            fontSize:'0.85rem',
          }}>
            <div style={{marginBottom:4}}>
              <span style={{color:'oklch(0.50 0.015 260)'}}>Created: </span>
              {new Date(project.created_at).toLocaleString()}
            </div>
            <div>
              <span style={{color:'oklch(0.50 0.015 260)'}}>Updated: </span>
              {new Date(project.updated_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
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

const btnDanger: React.CSSProperties = {
  padding:'10px 20px',
  borderRadius:8,
  fontSize:'0.88rem',
  fontWeight:600,
  background:'oklch(0.65 0.2 25)',
  color:'white',
  border:'none',
  cursor:'pointer',
};
