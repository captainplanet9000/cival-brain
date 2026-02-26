'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AudioFile {
  filename: string;
  size: number;
  type: string;
  created: string;
}

export default function AudioLibrary() {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const [showGenForm, setShowGenForm] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');

  const loadAudioFiles = async () => {
    const res = await fetch('/api/motion/audio').catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setAudioFiles(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAudioFiles();
  }, []);

  const generateAudio = async () => {
    if (!prompt.trim()) {
      setError('Prompt is required');
      return;
    }
    
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/motion/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration,
          filename: filename.trim() || undefined,
        }),
      });
      
      if (res.ok) {
        setPrompt('');
        setDuration(5);
        setFilename('');
        setShowGenForm(false);
        loadAudioFiles();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Generation failed');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(false);
  };

  const deleteAudio = async (fname: string) => {
    if (!confirm(`Delete ${fname}?`)) return;
    setDeleting(fname);
    await fetch(`/api/motion/audio/${fname}`, { method: 'DELETE' });
    loadAudioFiles();
    setDeleting(null);
  };

  const musicFiles = audioFiles.filter(f => f.type === 'music');
  const sfxFiles = audioFiles.filter(f => f.type === 'sfx' || f.type !== 'music');

  if (loading) {
    return <div style={{padding:40,color:'oklch(0.65 0.02 260)'}}>Loading audio library...</div>;
  }

  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:'1.3rem',fontWeight:700}}>🎵 Audio Library</h1>
          <p style={{color:'oklch(0.50 0.015 260)',fontSize:'0.82rem'}}>{audioFiles.length} audio files</p>
        </div>
        <Link href="/motion" style={{...btnSecondary,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
          ← Dashboard
        </Link>
      </div>

      {/* Generate New Track Section */}
      <div style={{
        marginBottom:32,
        padding:20,
        background:'oklch(0.17 0.015 260)',
        border:'1px solid oklch(0.28 0.015 260)',
        borderRadius:12,
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:showGenForm ? 16 : 0}}>
          <h2 style={{fontSize:'1rem',fontWeight:600}}>🎼 Generate New Track</h2>
          <button
            onClick={() => setShowGenForm(!showGenForm)}
            style={{
              ...btnSecondary,
              padding:'6px 14px',
              fontSize:'0.82rem',
            }}
          >
            {showGenForm ? '▼ Hide' : '▶ Show Form'}
          </button>
        </div>
        
        {showGenForm && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {error && (
              <div style={{
                background:'oklch(0.25 0.06 25)',
                border:'1px solid oklch(0.65 0.2 25)',
                borderRadius:8,
                padding:'10px 14px',
                color:'oklch(0.65 0.2 25)',
                fontSize:'0.85rem'
              }}>
                {error}
              </div>
            )}
            
            <div>
              <label style={labelStyle}>Prompt</label>
              <input
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Upbeat electronic background music with synths"
                style={inputStyle}
              />
            </div>
            
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label style={labelStyle}>Duration (seconds)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  min={1}
                  max={60}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Filename (optional)</label>
                <input
                  value={filename}
                  onChange={e => setFilename(e.target.value)}
                  placeholder="my-track.mp3"
                  style={inputStyle}
                />
              </div>
            </div>
            
            <button
              onClick={generateAudio}
              disabled={generating}
              style={{
                ...btnPrimary,
                opacity: generating ? 0.6 : 1,
              }}
            >
              {generating ? '⏳ Generating...' : '🎵 Generate Audio'}
            </button>
          </div>
        )}
      </div>

      {/* Background Music Section */}
      <div style={{marginBottom:32}}>
        <h2 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
          🎶 Background Music
          <span style={{fontSize:'0.75rem',fontWeight:500,color:'oklch(0.50 0.015 260)'}}>({musicFiles.length})</span>
        </h2>
        
        {musicFiles.length === 0 ? (
          <div style={{
            padding:40,
            textAlign:'center',
            background:'oklch(0.17 0.015 260)',
            border:'1px solid oklch(0.28 0.015 260)',
            borderRadius:12,
            color:'oklch(0.50 0.015 260)',
          }}>
            No music tracks yet. Generate one above!
          </div>
        ) : (
          <div style={{display:'grid',gap:12}}>
            {musicFiles.map(file => (
              <AudioCard
                key={file.filename}
                file={file}
                type="music"
                onDelete={deleteAudio}
                isDeleting={deleting === file.filename}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sound Effects Section */}
      <div>
        <h2 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
          🔊 Sound Effects
          <span style={{fontSize:'0.75rem',fontWeight:500,color:'oklch(0.50 0.015 260)'}}>({sfxFiles.length})</span>
        </h2>
        
        {sfxFiles.length === 0 ? (
          <div style={{
            padding:40,
            textAlign:'center',
            background:'oklch(0.17 0.015 260)',
            border:'1px solid oklch(0.28 0.015 260)',
            borderRadius:12,
            color:'oklch(0.50 0.015 260)',
          }}>
            No sound effects yet. Generate one above!
          </div>
        ) : (
          <div style={{display:'grid',gap:12}}>
            {sfxFiles.map(file => (
              <AudioCard
                key={file.filename}
                file={file}
                type="sfx"
                onDelete={deleteAudio}
                isDeleting={deleting === file.filename}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AudioCard({ file, type, onDelete, isDeleting }: { file: AudioFile; type: string; onDelete: (f: string) => void; isDeleting: boolean }) {
  const typeBadgeColor = type === 'music' ? 'oklch(0.65 0.18 300)' : 'oklch(0.65 0.18 155)';
  const typeBadgeBg = type === 'music' ? 'oklch(0.25 0.06 300)' : 'oklch(0.25 0.06 155)';
  
  return (
    <div
      style={{
        background:'oklch(0.17 0.015 260)',
        border:'1px solid oklch(0.28 0.015 260)',
        borderRadius:12,
        padding:16,
        display:'flex',
        alignItems:'center',
        gap:16,
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
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <div style={{fontWeight:600,fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {file.filename}
          </div>
          <span style={{
            padding:'2px 8px',
            borderRadius:12,
            fontSize:'0.7rem',
            fontWeight:600,
            background:typeBadgeBg,
            color:typeBadgeColor,
            flexShrink:0,
          }}>
            {type.toUpperCase()}
          </span>
        </div>
        <div style={{fontSize:'0.75rem',color:'oklch(0.50 0.015 260)'}}>
          {(file.size / 1024).toFixed(1)} KB
        </div>
      </div>
      
      <audio
        controls
        src={`/api/motion/audio/${file.filename}`}
        style={{width:'100%',maxWidth:300,height:36}}
      />
      
      <button
        onClick={() => onDelete(file.filename)}
        disabled={isDeleting}
        style={{
          ...btnDanger,
          padding:'8px 14px',
          fontSize:'0.82rem',
          opacity: isDeleting ? 0.6 : 1,
        }}
      >
        {isDeleting ? '⏳' : '🗑️'}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display:'block',
  fontSize:'0.82rem',
  fontWeight:600,
  color:'oklch(0.65 0.02 260)',
  marginBottom:4
};

const inputStyle: React.CSSProperties = {
  width:'100%',
  background:'oklch(0.15 0.01 260)',
  border:'1px solid oklch(0.28 0.015 260)',
  borderRadius:8,
  padding:'10px 12px',
  color:'oklch(0.93 0.01 260)',
  fontSize:'0.88rem',
};

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
