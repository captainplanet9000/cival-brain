'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Script {
  id: string;
  title: string;
  framework_id: string;
  category: string;
  series_name: string;
  episode_number: number;
  status: string;
  script_content: string;
  tts_content: string;
  music_prompt: string;
  video_prompt: string;
  visual_prompts: any[];
  word_count: number;
  estimated_duration_secs: number;
  tags: string[];
  created_at: string;
  audio_url: string | null;
  script_frameworks: { name: string; slug: string; channel: string } | null;
}

interface Voice {
  voice_id: string;
  name: string;
  description: string;
  category: string;
}

interface Framework {
  id: string;
  name: string;
  slug: string;
  script_count: number;
}

const FRAMEWORK_ICONS: Record<string, string> = {
  asmpro: '🎯',
  tension: '📖',
  claymation: '🎭',
  hunnibunni: '🐰',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'var(--purple-subtle)', text: 'var(--purple)' },
  review: { bg: 'var(--amber-subtle)', text: 'var(--amber)' },
  approved: { bg: 'var(--green-subtle)', text: 'var(--green)' },
  produced: { bg: 'var(--teal-subtle)', text: 'var(--teal)' },
  published: { bg: 'oklch(0.22 0.014 260)', text: 'var(--text-tertiary)' },
};

export default function ScriptLibrary() {
  return <Suspense fallback={<div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading...</div>}><ScriptLibraryInner /></Suspense>;
}

function ScriptLibraryInner() {
  const searchParams = useSearchParams();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Script | null>(null);
  const [search, setSearch] = useState('');
  const [filterFramework, setFilterFramework] = useState(searchParams.get('framework') || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [total, setTotal] = useState(0);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('Ashley');
  const [ttsTemperature, setTtsTemperature] = useState(1.1);   // Inworld default is 1.1
  const [ttsSpeakingRate, setTtsSpeakingRate] = useState(1.0); // Client-side playbackRate
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsSaving, setTtsSaving] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<any>(null);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceFilter, setVoiceFilter] = useState('all'); // 'all' | 'favorites' | language code
  const [favoriteVoices, setFavoriteVoices] = useState<Set<string>>(new Set());
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const voicePickerRef = useRef<HTMLDivElement>(null);

  const loadScripts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterCategory) params.set('category', filterCategory);

    // Framework filter needs ID lookup
    let baseUrl = `/api/scripts?${params}`;
    if (filterFramework) {
      const fw = frameworks.find(f => f.slug === filterFramework);
      if (fw) baseUrl += `&framework_id=${fw.id}`;
    }

    // Paginate to load ALL scripts (Supabase caps at 1000 per query)
    let allScripts: Script[] = [];
    let offset = 0;
    const pageSize = 1000;
    let totalCount = 0;

    while (true) {
      const res = await fetch(`${baseUrl}&limit=${pageSize}&offset=${offset}`);
      const data = await res.json();
      const page = data.data || [];
      if (data.count) totalCount = data.count;
      allScripts = [...allScripts, ...page];
      if (page.length < pageSize) break; // last page
      offset += pageSize;
    }

    setScripts(allScripts);
    setTotal(totalCount || allScripts.length);
  }, [search, filterFramework, filterStatus, filterCategory, frameworks]);

  // Load favorite voices from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cival-favorite-voices');
      if (saved) setFavoriteVoices(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const toggleFavorite = (voiceId: string) => {
    setFavoriteVoices(prev => {
      const next = new Set(prev);
      if (next.has(voiceId)) next.delete(voiceId); else next.add(voiceId);
      localStorage.setItem('cival-favorite-voices', JSON.stringify([...next]));
      return next;
    });
  };

  // Close voice picker on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (voicePickerRef.current && !voicePickerRef.current.contains(e.target as Node)) {
        setVoicePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetch('/api/scripts/frameworks').then(r => r.json()).then(setFrameworks);
    // Load Inworld voices
    fetch('/api/scripts/tts').then(r => r.json()).then(d => {
      if (d.voices && d.voices.length > 0) setVoices(d.voices);
    });
  }, []);

  useEffect(() => {
    if (frameworks.length > 0 || !filterFramework) {
      loadScripts().finally(() => setLoading(false));
    }
  }, [loadScripts, frameworks, filterFramework]);

  // Check if URL has specific script ID
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && scripts.length > 0) {
      const s = scripts.find(s => s.id === id);
      if (s) setSelected(s);
    }
  }, [searchParams, scripts]);

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/scripts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    loadScripts();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  // Reset TTS audio when switching scripts
  useEffect(() => {
    setTtsAudioUrl(null);
    setTtsError(null);
  }, [selected?.id]);

  // Fetch TTS engine status
  const checkTtsStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/scripts/tts?action=status');
      if (res.ok) setTtsStatus(await res.json());
    } catch {}
  }, []);

  // Poll TTS status while generating
  useEffect(() => {
    if (!ttsLoading) return;
    const interval = setInterval(checkTtsStatus, 5000);
    return () => clearInterval(interval);
  }, [ttsLoading, checkTtsStatus]);

  const generateTts = async () => {
    if (!selected) return;
    setTtsLoading(true);
    setTtsError(null);
    try {
      const res = await fetch('/api/scripts/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: selected.id, voiceId: selectedVoice, temperature: ttsTemperature, speakingRate: ttsSpeakingRate }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTtsError(data.error || `Generation failed (${res.status})`);
        return;
      }
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('json')) {
        const data = await res.json();
        if (data.error) { setTtsError(data.error); return; }
        if (data.audio_url) {
          // Saved directly
          setSelected({ ...selected, audio_url: data.audio_url });
          loadScripts();
        }
      } else {
        // Binary audio response — create blob URL for playback + download
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setTtsAudioUrl(url);
        // Apply playback rate after audio element renders
        setTimeout(() => {
          if (audioPreviewRef.current) {
            audioPreviewRef.current.playbackRate = ttsSpeakingRate;
          }
        }, 100);
      }
    } catch (e: any) {
      setTtsError(e.message || 'TTS generation failed');
    } finally {
      setTtsLoading(false);
    }
  };

  const saveTtsAudio = async () => {
    if (!selected) return;
    setTtsSaving(true);
    setTtsError(null);
    try {
      const res = await fetch('/api/scripts/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: selected.id, voiceId: selectedVoice, save: true, temperature: ttsTemperature, speakingRate: ttsSpeakingRate }),
      });
      if (res.status === 429) {
        setTtsError('GPU busy — try again later.');
        return;
      }
      const data = await res.json();
      if (data.error) { setTtsError(data.error); return; }
      if (data.audio_url) {
        setSelected({ ...selected, audio_url: data.audio_url });
        setTtsAudioUrl(null);
        loadScripts();
      }
    } catch (e: any) {
      setTtsError(e.message || 'Failed to save audio');
    } finally {
      setTtsSaving(false);
    }
  };

  const cancelTts = async () => {
    try {
      await fetch('/api/scripts/tts?action=cancel-all');
      setTtsError(null);
      setTtsLoading(false);
      checkTtsStatus();
    } catch {}
  };

  const [playAllIdx, setPlayAllIdx] = useState(-1);
  const [deletingAudio, setDeletingAudio] = useState(false);

  const scriptsWithAudio = scripts.filter(s => s.audio_url);

  const downloadAudio = (url: string, title: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const deleteAudio = async (id: string) => {
    if (!confirm('Delete saved audio?')) return;
    setDeletingAudio(true);
    try {
      await fetch('/api/scripts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, audio_url: null }) });
      if (selected?.id === id) setSelected({ ...selected!, audio_url: null });
      loadScripts();
    } catch { alert('Failed to delete audio'); }
    finally { setDeletingAudio(false); }
  };

  const categories = [...new Set(scripts.map(s => s.category).filter(Boolean))];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>📚 Script Library</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>{total} scripts</p>
        </div>
        <Link href="/scripts" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>← Dashboard</Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search scripts..."
          style={inputStyle}
        />
        <select value={filterFramework} onChange={e => setFilterFramework(e.target.value)} style={inputStyle}>
          <option value="">All Frameworks</option>
          {frameworks.map(f => <option key={f.id} value={f.slug}>{f.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="">All Statuses</option>
          {['draft', 'review', 'approved', 'produced', 'published'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={inputStyle}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Play All Audio Bar */}
      {scriptsWithAudio.length > 1 && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'linear-gradient(90deg, oklch(0.18 0.02 280), oklch(0.16 0.01 230))', border: '1px solid oklch(0.35 0.04 280 / 0.3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>🎧 {scriptsWithAudio.length} scripts with audio</span>
          <button
            onClick={() => { setPlayAllIdx(0); setSelected(scriptsWithAudio[0]); }}
            style={{ ...smallBtnStyle, background: 'oklch(0.55 0.15 280)', color: '#fff', border: 'none', fontWeight: 600, padding: '5px 12px', fontSize: '0.78rem' }}
          >▶️ Play All</button>
          {playAllIdx >= 0 && (
            <>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Playing {playAllIdx + 1}/{scriptsWithAudio.length}: {scriptsWithAudio[playAllIdx]?.title}</span>
              <audio
                key={playAllIdx}
                autoPlay
                src={scriptsWithAudio[playAllIdx]?.audio_url || ''}
                onEnded={() => {
                  const next = playAllIdx + 1;
                  if (next < scriptsWithAudio.length) { setPlayAllIdx(next); setSelected(scriptsWithAudio[next]); }
                  else setPlayAllIdx(-1);
                }}
                style={{ height: 30 }}
                controls
              />
              <button onClick={() => setPlayAllIdx(-1)} style={{ ...smallBtnStyle, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: 'none', fontSize: '0.75rem' }}>⏹ Stop</button>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Script List */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          {loading ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : scripts.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>No scripts found.</div>
          ) : scripts.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              style={{
                padding: '12px 16px',
                borderBottom: i < scripts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                cursor: 'pointer',
                background: selected?.id === s.id ? 'var(--accent-subtle)' : 'transparent',
              }}
            >
              <div style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 4 }}>{s.audio_url ? '🔊 ' : ''}{s.title}</div>
              <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text-tertiary)', alignItems: 'center' }}>
                {s.script_frameworks && <span>{s.script_frameworks.name}</span>}
                {s.category && <span>• {s.category}</span>}
                {s.series_name && <span>• {s.series_name} E{s.episode_number}</span>}
                <span>• {s.word_count}w</span>
                <StatusBadge status={s.status} />
              </div>
            </div>
          ))}
        </div>

        {/* Script Detail */}
        {selected && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'auto', maxHeight: 'calc(100vh - 200px)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{selected.title}</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selected.script_frameworks && <span>{selected.script_frameworks.name}</span>}
                  {selected.category && <span>• {selected.category}</span>}
                  {selected.series_name && <span>• {selected.series_name} Ep.{selected.episode_number}</span>}
                  <span>• {selected.word_count} words</span>
                  <span>• {selected.estimated_duration_secs}s</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {/* Status change */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['draft', 'review', 'approved', 'produced', 'published'].map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, s)} style={{
                  ...smallBtnStyle,
                  background: selected.status === s ? (STATUS_COLORS[s]?.bg || 'var(--bg-elevated)') : 'var(--bg-elevated)',
                  color: selected.status === s ? (STATUS_COLORS[s]?.text || 'var(--text-primary)') : 'var(--text-secondary)',
                  fontWeight: selected.status === s ? 600 : 400,
                }}>{s}</button>
              ))}
            </div>

            {/* TTS Audio Section - prominent placement */}
            <div style={{ marginBottom: 16, padding: 14, background: 'linear-gradient(135deg, oklch(0.18 0.02 280), oklch(0.16 0.015 260))', border: '1px solid oklch(0.35 0.04 280 / 0.4)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>🎙️ Inworld TTS</h3>
                {selected.audio_url && <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600 }}>✅ Audio saved</span>}
              </div>

              {selected.audio_url && (
                <div style={{ marginBottom: 10 }}>
                  <audio controls src={selected.audio_url} style={{ width: '100%', height: 36, marginBottom: 6 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => downloadAudio(selected.audio_url!, selected.title)} style={{ ...smallBtnStyle, background: 'oklch(0.35 0.08 230)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.78rem' }}>⬇️ Download</button>
                    <button onClick={() => deleteAudio(selected.id)} disabled={deletingAudio} style={{ ...smallBtnStyle, background: 'oklch(0.35 0.1 25)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.78rem' }}>{deletingAudio ? '⏳' : '🗑️ Delete Audio'}</button>
                  </div>
                </div>
              )}

              {/* Voice + slider controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Voice selector row */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div ref={voicePickerRef} style={{ position: 'relative', minWidth: 280, flex: 1 }}>
                    <button
                      onClick={() => setVoicePickerOpen(!voicePickerOpen)}
                      style={{
                        ...inputStyle, width: '100%', padding: '6px 10px', fontSize: '0.78rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'pointer', textAlign: 'left',
                        border: voicePickerOpen ? '1px solid oklch(0.55 0.15 280)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <span>
                        {favoriteVoices.has(selectedVoice) ? '⭐ ' : ''}
                        {voices.find(v => v.voice_id === selectedVoice)?.name || selectedVoice}
                        <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>
                          {voices.find(v => v.voice_id === selectedVoice)?.description?.slice(0, 40) || ''}
                        </span>
                      </span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{voicePickerOpen ? '▲' : '▼'}</span>
                    </button>

                    {voicePickerOpen && (() => {
                      const languages = [...new Set(voices.map(v => v.category))].sort();
                      const filtered = voices.filter(v => {
                        const matchesSearch = !voiceSearch ||
                          v.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                          (v.description || '').toLowerCase().includes(voiceSearch.toLowerCase());
                        const matchesFilter = voiceFilter === 'all' ||
                          (voiceFilter === 'favorites' ? favoriteVoices.has(v.voice_id) : v.category === voiceFilter);
                        return matchesSearch && matchesFilter;
                      });
                      // Sort: favorites first, then alphabetical
                      const sorted = [...filtered].sort((a, b) => {
                        const aFav = favoriteVoices.has(a.voice_id) ? 0 : 1;
                        const bFav = favoriteVoices.has(b.voice_id) ? 0 : 1;
                        if (aFav !== bFav) return aFav - bFav;
                        return a.name.localeCompare(b.name);
                      });

                      return (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                          background: 'var(--bg-elevated)', border: '1px solid oklch(0.35 0.04 280 / 0.5)',
                          borderRadius: 'var(--radius-md)', marginTop: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                          maxHeight: 380, display: 'flex', flexDirection: 'column',
                        }}>
                          {/* Search bar */}
                          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <input
                              autoFocus
                              value={voiceSearch}
                              onChange={e => setVoiceSearch(e.target.value)}
                              placeholder="Search voices..."
                              style={{
                                ...inputStyle, width: '100%', padding: '6px 8px', fontSize: '0.78rem',
                                background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
                              }}
                            />
                          </div>

                          {/* Language filter tabs */}
                          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {[
                              { key: 'all', label: `All (${voices.length})` },
                              { key: 'favorites', label: `⭐ (${favoriteVoices.size})` },
                              ...languages.map(l => ({ key: l, label: l.toUpperCase() })),
                            ].map(tab => (
                              <button
                                key={tab.key}
                                onClick={() => setVoiceFilter(tab.key)}
                                style={{
                                  padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.68rem',
                                  fontWeight: voiceFilter === tab.key ? 700 : 400,
                                  background: voiceFilter === tab.key ? 'oklch(0.4 0.1 280 / 0.4)' : 'transparent',
                                  color: voiceFilter === tab.key ? 'oklch(0.8 0.12 280)' : 'var(--text-tertiary)',
                                  border: 'none', cursor: 'pointer',
                                }}
                              >{tab.label}</button>
                            ))}
                          </div>

                          {/* Voice list */}
                          <div style={{ overflowY: 'auto', flex: 1 }}>
                            {sorted.length === 0 ? (
                              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                                No voices match "{voiceSearch}"
                              </div>
                            ) : sorted.map(v => (
                              <div
                                key={v.voice_id}
                                style={{
                                  padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                  background: v.voice_id === selectedVoice ? 'oklch(0.25 0.04 280 / 0.5)' : 'transparent',
                                  borderBottom: '1px solid oklch(0.2 0.01 260 / 0.3)',
                                }}
                                onClick={() => { setSelectedVoice(v.voice_id); setVoicePickerOpen(false); setVoiceSearch(''); }}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(v.voice_id); }}
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                                    padding: 0, lineHeight: 1, flexShrink: 0, opacity: favoriteVoices.has(v.voice_id) ? 1 : 0.3,
                                  }}
                                  title={favoriteVoices.has(v.voice_id) ? 'Remove from favorites' : 'Add to favorites'}
                                >⭐</button>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {v.name}
                                    <span style={{ marginLeft: 6, fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'uppercase' }}>{v.category}</span>
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {v.description || ''}
                                  </div>
                                </div>
                                {v.voice_id === selectedVoice && <span style={{ fontSize: '0.75rem', color: 'oklch(0.7 0.15 280)' }}>✓</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <button
                    onClick={generateTts}
                    disabled={ttsLoading}
                    style={{
                      ...smallBtnStyle,
                      background: ttsLoading ? 'var(--bg-elevated)' : 'oklch(0.55 0.15 280)',
                      color: '#fff',
                      fontWeight: 600,
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      border: 'none',
                    }}
                  >
                    {ttsLoading ? '⏳ Generating...' : selected.audio_url ? '🔄 Regenerate' : '🔊 Generate Audio'}
                  </button>
                  {ttsLoading && (
                    <button onClick={cancelTts} style={{ ...smallBtnStyle, background: 'oklch(0.35 0.1 25)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.78rem' }}>
                      ⏹ Cancel
                    </button>
                  )}
                </div>

                {/* Temperature + Speaking Rate sliders */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

                  {/* Temperature — controls Inworld expressiveness at generation time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 200, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em' }}>🌡 TEMPERATURE</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.78rem', color: 'oklch(0.75 0.15 280)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{ttsTemperature.toFixed(2)}</span>
                        {ttsTemperature !== 1.1 && (
                          <button
                            onClick={() => setTtsTemperature(1.1)}
                            title="Reset to default (1.1)"
                            style={{ background: 'none', border: '1px solid oklch(0.4 0.05 280 / 0.5)', borderRadius: 4, color: 'oklch(0.6 0.08 280)', cursor: 'pointer', fontSize: '0.6rem', padding: '1px 5px', lineHeight: 1.4, fontWeight: 600 }}
                          >
                            ↺ reset
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.5}
                      step={0.01}
                      value={ttsTemperature}
                      onChange={e => setTtsTemperature(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'oklch(0.6 0.18 280)', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                      <span>0.6 Consistent</span>
                      <span style={{ opacity: 0.5 }}>default 1.1</span>
                      <span>Expressive 1.5</span>
                    </div>
                  </div>

                  {/* Talking Speed — FFmpeg atempo server-side + live playbackRate preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 200, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em' }}>⚡ TALKING SPEED</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.78rem', color: 'oklch(0.75 0.15 160)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{ttsSpeakingRate.toFixed(2)}x</span>
                        {ttsSpeakingRate !== 1.0 && (
                          <button
                            onClick={() => {
                              setTtsSpeakingRate(1.0);
                              if (audioPreviewRef.current) audioPreviewRef.current.playbackRate = 1.0;
                            }}
                            title="Reset to default (1.0x)"
                            style={{ background: 'none', border: '1px solid oklch(0.4 0.05 160 / 0.5)', borderRadius: 4, color: 'oklch(0.6 0.08 160)', cursor: 'pointer', fontSize: '0.6rem', padding: '1px 5px', lineHeight: 1.4, fontWeight: 600 }}
                          >
                            ↺ reset
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={ttsSpeakingRate}
                      onChange={e => {
                        const rate = parseFloat(e.target.value);
                        setTtsSpeakingRate(rate);
                        if (audioPreviewRef.current) audioPreviewRef.current.playbackRate = rate;
                      }}
                      style={{ width: '100%', accentColor: 'oklch(0.6 0.18 160)', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                      <span>0.5x Slower</span>
                      <span style={{ opacity: 0.5 }}>default 1.0x</span>
                      <span>Faster 2.0x</span>
                    </div>
                  </div>

                </div>
              </div>

              {ttsError && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'oklch(0.2 0.06 25)', border: '1px solid oklch(0.4 0.1 25 / 0.4)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'oklch(0.8 0.1 25)' }}>
                  ⚠️ {ttsError}
                  <button onClick={() => setTtsError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'oklch(0.6 0.05 25)', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                </div>
              )}

              {ttsLoading && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'oklch(0.18 0.02 230)', border: '1px solid oklch(0.35 0.04 230 / 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  🔄 Generating via Inworld TTS-1.5-Max... Long scripts may take 10–30s.
                </div>
              )}

              {ttsAudioUrl && (
                <div style={{ marginTop: 10 }}>
                  <audio
                    ref={audioPreviewRef}
                    controls
                    src={ttsAudioUrl}
                    style={{ width: '100%', height: 36, marginBottom: 8 }}
                    onLoadedMetadata={e => { (e.target as HTMLAudioElement).playbackRate = ttsSpeakingRate; }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={saveTtsAudio}
                      disabled={ttsSaving}
                      style={{
                        ...smallBtnStyle,
                        background: 'oklch(0.45 0.12 145)',
                        color: '#fff',
                        fontWeight: 600,
                        padding: '6px 14px',
                        border: 'none',
                      }}
                    >
                      {ttsSaving ? '⏳ Saving...' : '💾 Save Audio to Library'}
                    </button>
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = ttsAudioUrl;
                        a.download = `${selected?.title?.replace(/[^a-z0-9]/gi, '_') || 'audio'}.mp3`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      style={{
                        ...smallBtnStyle,
                        background: 'oklch(0.35 0.08 230)',
                        color: '#fff',
                        fontWeight: 600,
                        padding: '6px 14px',
                        border: 'none',
                      }}
                    >
                      ⬇️ Download MP3
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Script Content */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Script</h3>
                {selected.script_content && <CopyButton text={selected.script_content} label="script" />}
              </div>
              <pre style={preStyle}>{selected.script_content}</pre>
            </div>

            {selected.tts_content && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>TTS Version</h3>
                  <CopyButton text={selected.tts_content} label="TTS text" />
                </div>
                <pre style={preStyle}>{selected.tts_content}</pre>
              </div>
            )}

            {selected.music_prompt && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>🎵 Music Prompt</h3>
                  <CopyButton text={selected.music_prompt} label="music prompt" />
                </div>
                <pre style={{ ...preStyle, fontSize: '0.8rem' }}>{selected.music_prompt}</pre>
              </div>
            )}

            {selected.video_prompt && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>🎬 Video Prompt</h3>
                  <CopyButton text={selected.video_prompt} label="video prompt" />
                </div>
                <pre style={{ ...preStyle, fontSize: '0.8rem' }}>{selected.video_prompt}</pre>
              </div>
            )}

            {selected.visual_prompts && selected.visual_prompts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>🖼️ Visual Prompts</h3>
                  <CopyButton text={selected.visual_prompts.map((vp: any, i: number) => typeof vp === 'string' ? vp : (vp.prompt || JSON.stringify(vp))).join('\n\n')} label="all visual prompts" />
                </div>
                {selected.visual_prompts.map((vp: any, i: number) => (
                  <div key={i} style={{ position: 'relative', marginBottom: 6 }}>
                    <pre style={{ ...preStyle, fontSize: '0.8rem', paddingRight: 70 }}>{typeof vp === 'string' ? vp : JSON.stringify(vp)}</pre>
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <CopyButton text={typeof vp === 'string' ? vp : (vp.prompt || JSON.stringify(vp))} label={`visual prompt ${i + 1}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };
  return (
    <button
      onClick={copy}
      title={label ? `Copy ${label}` : 'Copy to clipboard'}
      style={{
        background: copied ? 'oklch(0.35 0.1 145 / 0.4)' : 'oklch(0.25 0.02 260 / 0.6)',
        border: copied ? '1px solid oklch(0.5 0.12 145 / 0.5)' : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        color: copied ? 'oklch(0.8 0.12 145)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '3px 8px',
        transition: 'all 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontSize: '0.7rem', fontWeight: 600,
      padding: '1px 6px', borderRadius: 'var(--radius-sm)',
      textTransform: 'capitalize',
    }}>{status}</span>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  minWidth: 140,
};

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.75rem',
  border: '1px solid var(--border-subtle)',
  cursor: 'pointer',
};

const preStyle: React.CSSProperties = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: 14,
  fontSize: '0.82rem',
  fontFamily: 'var(--font-mono)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.6,
  color: 'var(--text-primary)',
  maxHeight: 400,
  overflow: 'auto',
};
