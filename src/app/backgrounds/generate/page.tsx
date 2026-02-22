'use client';

import { useState } from 'react';
import Link from 'next/link';

const CATEGORIES = ['forests','grasslands','garden','botanicals','wetland','sky','weather','golden_hour','ocean','water','rain_lakes','underwater','coastal','desert','mountains','night','light','macro','autumn'];
const MOODS = ['calm','warm','contemplative','hopeful','serene','mysterious','energetic','melancholic','peaceful','dramatic'];
const STYLES = ['nature', 'cosmic', 'organic', 'abstract', 'minimal'];

const categoryColors: Record<string, string> = {
  forests: 'oklch(0.65 0.15 145)', grasslands: 'oklch(0.7 0.15 130)', garden: 'oklch(0.65 0.12 155)',
  sky: 'oklch(0.7 0.12 230)', ocean: 'oklch(0.6 0.15 230)', desert: 'oklch(0.7 0.12 70)',
  night: 'oklch(0.45 0.12 280)', macro: 'oklch(0.6 0.15 30)', autumn: 'oklch(0.65 0.15 50)',
};

interface GeneratedPrompt {
  title: string;
  prompt: string;
  category: string;
  mood: string;
  style: string;
  saved?: boolean;
}

export default function GeneratePage() {
  const [category, setCategory] = useState('');
  const [mood, setMood] = useState('');
  const [style, setStyle] = useState('');
  const [batchSize, setBatchSize] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedPrompt[]>([]);
  const [toast, setToast] = useState('');

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/backgrounds/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category || undefined, mood: mood || undefined, style: style || undefined, count: batchSize }),
      });
      const d = await res.json();
      if (d.prompts) {
        setResults(prev => [...d.prompts.map((p: any) => ({ ...p, category: category || p.category, mood: mood || p.mood, style: style || p.style, saved: false })), ...prev]);
      } else if (d.error) {
        setToast('Error: ' + d.error);
      }
    } catch {
      setToast('Generation failed');
    }
    setGenerating(false);
  };

  const savePrompt = async (idx: number) => {
    const p = results[idx];
    const res = await fetch('/api/backgrounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: p.title,
        prompt: p.prompt,
        category: p.category || 'general',
        mood: p.mood || 'neutral',
        style: p.style || 'nature',
        motion_type: 'slow_drift',
        format: '9:16 vertical',
        loop_friendly: true,
        caption_safe: true,
        platform: 'higgsfield',
        status: 'draft',
      }),
    });
    if (res.ok) {
      const updated = [...results];
      updated[idx] = { ...updated[idx], saved: true };
      setResults(updated);
      setToast('Saved!');
    }
  };

  const saveAll = async () => {
    for (let i = 0; i < results.length; i++) {
      if (!results[i].saved) await savePrompt(i);
    }
    setToast(`Saved ${results.filter(r => !r.saved).length} prompts!`);
  };

  const selStyle = (val: string, opts: string[], set: (v: string) => void, colors?: Record<string, string>) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {opts.map(o => (
        <button key={o} onClick={() => set(val === o ? '' : o)}
          style={{
            padding: '6px 14px', borderRadius: 8, border: `1px solid ${val === o ? (colors?.[o] || 'oklch(0.65 0.15 250)') : 'oklch(0.28 0.02 250)'}`,
            background: val === o ? (colors?.[o] || 'oklch(0.65 0.15 250)') + '22' : 'oklch(0.17 0.01 250)',
            color: val === o ? 'oklch(0.9 0 0)' : 'oklch(0.6 0 0)', cursor: 'pointer', fontSize: 13, textTransform: 'capitalize', fontWeight: val === o ? 600 : 400,
          }}>
          {o.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'oklch(0.13 0.01 250)', color: 'oklch(0.92 0 0)', padding: '24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link href="/backgrounds" style={{ color: 'oklch(0.6 0 0)', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Generate Prompts</h1>
        </div>

        {/* Configuration */}
        <div style={{ background: 'oklch(0.17 0.01 250)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid oklch(0.22 0.02 250)' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.7 0 0)', marginBottom: 8, display: 'block' }}>Category</label>
            {selStyle(category, CATEGORIES, setCategory, categoryColors)}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.7 0 0)', marginBottom: 8, display: 'block' }}>Mood</label>
            {selStyle(mood, MOODS, setMood)}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.7 0 0)', marginBottom: 8, display: 'block' }}>Style</label>
            {selStyle(style, STYLES, setStyle)}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.7 0 0)', marginBottom: 8, display: 'block' }}>Batch Size</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 5, 10, 25].map(n => (
                <button key={n} onClick={() => setBatchSize(n)}
                  style={{
                    padding: '8px 18px', borderRadius: 8, border: `1px solid ${batchSize === n ? 'oklch(0.65 0.15 250)' : 'oklch(0.28 0.02 250)'}`,
                    background: batchSize === n ? 'oklch(0.25 0.05 250)' : 'oklch(0.17 0.01 250)',
                    color: batchSize === n ? 'oklch(0.9 0 0)' : 'oklch(0.6 0 0)', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button onClick={generate} disabled={generating}
            style={{ padding: '12px 32px', background: generating ? 'oklch(0.35 0.05 250)' : 'oklch(0.65 0.15 250)', border: 'none', borderRadius: 8, color: 'white', cursor: generating ? 'wait' : 'pointer', fontSize: 15, fontWeight: 700 }}>
            {generating ? `Generating ${batchSize}...` : `Generate ${batchSize} Prompt${batchSize > 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Generated ({results.length})</h2>
              <button onClick={saveAll} style={{ padding: '8px 20px', background: 'oklch(0.4 0.12 145)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Save All Unsaved
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.map((p, i) => (
                <div key={i} style={{ background: 'oklch(0.17 0.01 250)', borderRadius: 10, padding: 16, border: `1px solid ${p.saved ? 'oklch(0.35 0.1 145)' : 'oklch(0.22 0.02 250)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.title}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => navigator.clipboard.writeText(p.prompt).then(() => setToast('Copied!'))}
                        style={{ padding: '5px 14px', background: 'oklch(0.65 0.15 250)', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                        📋 Copy
                      </button>
                      {!p.saved && (
                        <button onClick={() => savePrompt(i)}
                          style={{ padding: '5px 14px', background: 'oklch(0.4 0.12 145)', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          💾 Save
                        </button>
                      )}
                      {p.saved && <span style={{ fontSize: 12, color: 'oklch(0.6 0.1 145)', padding: '5px 10px' }}>✓ Saved</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'oklch(0.65 0 0)', lineHeight: 1.5 }}>{p.prompt}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'oklch(0.3 0.05 145)', color: 'white', padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 9999 }}
          ref={el => { if (el) setTimeout(() => setToast(''), 2000); }}>
          {toast}
        </div>
      )}
    </div>
  );
}
