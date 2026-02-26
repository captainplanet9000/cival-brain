'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface AudioFile {
  filename: string;
  size: number;
  type: string;
}

function CreateProjectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [resolution, setResolution] = useState('1920x1080');
  const [fps, setFps] = useState(30);
  
  const [brandConfigOpen, setBrandConfigOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [tagline, setTagline] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [accentColor, setAccentColor] = useState('#10b981');
  
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [selectedAudio, setSelectedAudio] = useState('');
  const [audioGenOpen, setAudioGenOpen] = useState(false);
  const [audioPrompt, setAudioPrompt] = useState('');
  const [audioDuration, setAudioDuration] = useState(5);
  const [audioGenerating, setAudioGenerating] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlPrompt = searchParams.get('prompt');
    const urlTitle = searchParams.get('title');
    if (urlPrompt) setPrompt(decodeURIComponent(urlPrompt));
    if (urlTitle) setTitle(decodeURIComponent(urlTitle));
    
    fetch('/api/motion/audio').then(r => r.ok ? r.json() : []).then(data => {
      setAudioFiles(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [searchParams]);

  const generateAudio = async () => {
    if (!audioPrompt.trim()) return;
    setAudioGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/motion/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: audioPrompt, duration: audioDuration }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.filename) {
          setSelectedAudio(data.filename);
          const updated = await fetch('/api/motion/audio').then(r => r.json()).catch(() => []);
          setAudioFiles(Array.isArray(updated) ? updated : []);
          setAudioPrompt('');
          setAudioGenOpen(false);
        }
      } else {
        setError('Audio generation failed');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setAudioGenerating(false);
  };

  const save = async (queueRender: boolean) => {
    if (!title.trim() || !prompt.trim()) {
      setError('Title and prompt are required');
      return;
    }
    
    setSaving(true);
    setError('');
    try {
      const brandConfig = companyName || tagline ? {
        company_name: companyName,
        tagline,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
      } : null;
      
      const res = await fetch('/api/motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          prompt,
          description,
          duration,
          resolution,
          fps,
          brand_config: brandConfig,
          audio_track: selectedAudio || null,
          status: queueRender ? 'queued' : 'draft',
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const projectId = data.id;
        
        if (queueRender && projectId) {
          await fetch('/api/motion/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId }),
          });
        }
        
        router.push(`/motion/projects/${projectId}`);
      } else {
        setError('Failed to save project');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:'1.3rem',fontWeight:700}}>⚡ Create Motion Graphics Project</h1>
          <p style={{color:'oklch(0.50 0.015 260)',fontSize:'0.82rem'}}>Define your video project</p>
        </div>
        <Link href="/motion" style={{color:'oklch(0.65 0.02 260)',fontSize:'0.85rem',textDecoration:'none'}}>← Dashboard</Link>
      </div>

      {error && (
        <div style={{background:'oklch(0.25 0.06 25)',border:'1px solid oklch(0.65 0.2 25)',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'oklch(0.65 0.2 25)',fontSize:'0.85rem'}}>
          {error}
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {/* Title */}
        <div>
          <label style={labelStyle}>Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="My Amazing Video"
            style={inputStyle}
          />
        </div>

        {/* Prompt */}
        <div>
          <label style={labelStyle}>Prompt</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the video you want to create..."
            rows={6}
            style={{...inputStyle,fontFamily:'monospace',resize:'vertical'}}
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            style={{...inputStyle,resize:'vertical'}}
          />
        </div>

        {/* Settings */}
        <div>
          <h3 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:12}}>Settings</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:12}}>
            <div>
              <label style={labelStyle}>Duration (seconds)</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={inputStyle}>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Resolution</label>
              <select value={resolution} onChange={e => setResolution(e.target.value)} style={inputStyle}>
                <option value="1920x1080">1920x1080 (Full HD)</option>
                <option value="1280x720">1280x720 (HD)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>FPS</label>
              <select value={fps} onChange={e => setFps(Number(e.target.value))} style={inputStyle}>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Brand Config */}
        <div>
          <div
            onClick={() => setBrandConfigOpen(!brandConfigOpen)}
            style={{
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center',
              padding:'12px 16px',
              background:'oklch(0.17 0.015 260)',
              border:'1px solid oklch(0.28 0.015 260)',
              borderRadius:8,
              cursor:'pointer',
              marginBottom: brandConfigOpen ? 12 : 0,
            }}
          >
            <h3 style={{fontSize:'0.95rem',fontWeight:600}}>Brand Configuration</h3>
            <span style={{fontSize:'1.2rem',transition:'transform 0.2s',transform:brandConfigOpen ? 'rotate(180deg)' : 'rotate(0deg)'}}>▼</span>
          </div>
          {brandConfigOpen && (
            <div style={{display:'flex',flexDirection:'column',gap:12,padding:'16px',background:'oklch(0.17 0.015 260)',border:'1px solid oklch(0.28 0.015 260)',borderTop:'none',borderRadius:'0 0 8px 8px'}}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ACME Inc" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tagline</label>
                <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Innovation at its finest" style={inputStyle} />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:12}}>
                <div>
                  <label style={labelStyle}>Primary Color</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{width:50,height:36,border:'1px solid oklch(0.28 0.015 260)',borderRadius:8,cursor:'pointer'}} />
                    <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{...inputStyle,flex:1,fontFamily:'monospace',fontSize:'0.8rem'}} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Secondary Color</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{width:50,height:36,border:'1px solid oklch(0.28 0.015 260)',borderRadius:8,cursor:'pointer'}} />
                    <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{...inputStyle,flex:1,fontFamily:'monospace',fontSize:'0.8rem'}} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Accent Color</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{width:50,height:36,border:'1px solid oklch(0.28 0.015 260)',borderRadius:8,cursor:'pointer'}} />
                    <input value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{...inputStyle,flex:1,fontFamily:'monospace',fontSize:'0.8rem'}} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audio Track */}
        <div>
          <h3 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:12}}>Audio Track</h3>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <select value={selectedAudio} onChange={e => setSelectedAudio(e.target.value)} style={inputStyle}>
              <option value="">No audio</option>
              {audioFiles.map(f => (
                <option key={f.filename} value={f.filename}>{f.filename} ({(f.size / 1024).toFixed(0)} KB)</option>
              ))}
            </select>
            {selectedAudio && (
              <audio controls src={`/api/motion/audio/${selectedAudio}`} style={{width:'100%',height:36}} />
            )}
            <div>
              <button
                onClick={() => setAudioGenOpen(!audioGenOpen)}
                style={{...btnSecondary,width:'100%'}}
              >
                {audioGenOpen ? '▼' : '▶'} Generate New Audio
              </button>
              {audioGenOpen && (
                <div style={{marginTop:12,padding:16,background:'oklch(0.17 0.015 260)',border:'1px solid oklch(0.28 0.015 260)',borderRadius:8,display:'flex',flexDirection:'column',gap:12}}>
                  <div>
                    <label style={labelStyle}>Audio Prompt</label>
                    <input
                      value={audioPrompt}
                      onChange={e => setAudioPrompt(e.target.value)}
                      placeholder="Upbeat electronic background music"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Duration (seconds)</label>
                    <input
                      type="number"
                      value={audioDuration}
                      onChange={e => setAudioDuration(Number(e.target.value))}
                      min={1}
                      max={60}
                      style={inputStyle}
                    />
                  </div>
                  <button
                    onClick={generateAudio}
                    disabled={audioGenerating}
                    style={{...btnPrimary,opacity:audioGenerating ? 0.6 : 1}}
                  >
                    {audioGenerating ? '⏳ Generating...' : '🎵 Generate'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{display:'flex',gap:12,marginTop:16}}>
          <button
            onClick={() => save(false)}
            disabled={saving}
            style={{...btnSecondary,flex:1,opacity:saving ? 0.6 : 1}}
          >
            {saving ? 'Saving...' : '💾 Save Draft'}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            style={{...btnPrimary,flex:1,opacity:saving ? 0.6 : 1}}
          >
            {saving ? 'Saving...' : '⚡ Save & Queue Render'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreateProject() {
  return (
    <Suspense fallback={<div style={{padding:40,color:'oklch(0.65 0.02 260)'}}>Loading...</div>}>
      <CreateProjectInner />
    </Suspense>
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
