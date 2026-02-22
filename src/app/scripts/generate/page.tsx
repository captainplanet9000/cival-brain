'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Framework {
  id: string;
  name: string;
  slug: string;
  description: string;
  framework_type: string;
  structure: any;
  config: any;
}

const FRAMEWORK_ICONS: Record<string, string> = { asmpro: '🎯', tension: '📖', claymation: '🎭', hunnibunni: '🐰' };

export default function GenerateScript() {
  const [step, setStep] = useState(1);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [config, setConfig] = useState({ category: '', genre: '', tone: '', topic: '', custom: '', archetype: '' });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [editedResult, setEditedResult] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/scripts/frameworks').then(r => r.json()).then(setFrameworks);
  }, []);

  const buildPrompt = () => {
    const parts: string[] = [];
    if (config.category) parts.push(`Category: ${config.category}`);
    if (config.genre) parts.push(`Genre: ${config.genre}`);
    if (config.archetype) parts.push(`Archetype: ${config.archetype}`);
    if (config.tone) parts.push(`Tone: ${config.tone}`);
    if (config.topic) parts.push(`Topic: ${config.topic}`);
    if (config.custom) parts.push(config.custom);
    if (parts.length === 0) parts.push('Generate a script following the framework guidelines');
    return parts.join('\n');
  };

  const generate = async () => {
    if (!selectedFramework) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework_id: selectedFramework.id,
          prompt: buildPrompt(),
          generation_params: config,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.content);
        setEditedResult(data.content);
        setStep(4);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(false);
  };

  const save = async () => {
    if (!selectedFramework) return;
    setSaving(true);
    // Parse title from content
    const titleMatch = editedResult.match(/Title:\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : `${config.category || config.genre || 'Script'} - ${new Date().toLocaleDateString()}`;

    // Extract sections — check for Inworld TTS section first, then legacy formats
    const ttsMatch = editedResult.match(/=== (?:INWORLD TTS|VIBEVOICE|CLEAN TTS|TTS)[^=]*===\s*([\s\S]*?)(?===|$)/i);
    const sunoMatch = editedResult.match(/=== SUNO[^=]*===\s*([\s\S]*?)(?===|$)/i);
    const higgsfieldMatch = editedResult.match(/=== HIGGSFIELD[^=]*===\s*([\s\S]*?)(?===|$)/i);
    const visualMatch = editedResult.match(/=== VISUAL[^=]*===\s*([\s\S]*?)(?===|$)/i);

    const wordCount = editedResult.split(/\s+/).filter(Boolean).length;

    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          framework_id: selectedFramework.id,
          category: config.category || config.genre || null,
          status: 'draft',
          script_content: editedResult,
          tts_content: ttsMatch ? ttsMatch[1].trim() : null,
          music_prompt: sunoMatch ? sunoMatch[1].trim() : null,
          video_prompt: higgsfieldMatch ? higgsfieldMatch[1].trim() : null,
          visual_prompts: visualMatch ? [visualMatch[1].trim()] : [],
          word_count: wordCount,
          tags: [selectedFramework.slug, config.category, config.genre].filter(Boolean),
          metadata: { generation_config: config },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setStep(5);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>⚡ Generate Script</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>AI-powered script generation</p>
        </div>
        <Link href="/scripts" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>← Dashboard</Link>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {['Framework', 'Configure', 'Generate', 'Review', 'Done'].map((label, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 4, borderRadius: 2, marginBottom: 6,
              background: i + 1 <= step ? 'var(--accent)' : 'var(--border-subtle)',
            }} />
            <span style={{ fontSize: '0.72rem', color: i + 1 <= step ? 'var(--accent)' : 'var(--text-tertiary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--rose-subtle)', border: '1px solid var(--rose)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, color: 'var(--rose)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Step 1: Choose Framework */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Choose Framework</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            {frameworks.map(f => (
              <div
                key={f.id}
                onClick={() => { setSelectedFramework(f); setStep(2); }}
                style={{
                  background: 'var(--bg-surface)',
                  border: `2px solid ${selectedFramework?.id === f.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{FRAMEWORK_ICONS[f.slug] || '📝'}</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && selectedFramework && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Configure — {selectedFramework.name}</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {selectedFramework.structure.categories && (
              <div>
                <label style={labelStyle}>Category</label>
                <select value={config.category} onChange={e => setConfig({ ...config, category: e.target.value })} style={inputStyle}>
                  <option value="">Select category...</option>
                  {selectedFramework.structure.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            {selectedFramework.structure.genres && (
              <div>
                <label style={labelStyle}>Genre</label>
                <select value={config.genre} onChange={e => setConfig({ ...config, genre: e.target.value })} style={inputStyle}>
                  <option value="">Select genre...</option>
                  {selectedFramework.structure.genres.map((g: string) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            )}
            {selectedFramework.structure.archetypes && (
              <div>
                <label style={labelStyle}>Archetype</label>
                <select value={config.archetype} onChange={e => setConfig({ ...config, archetype: e.target.value })} style={inputStyle}>
                  <option value="">Select archetype...</option>
                  {selectedFramework.structure.archetypes.map((a: string) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle}>Tone</label>
              <input value={config.tone} onChange={e => setConfig({ ...config, tone: e.target.value })} placeholder="e.g. urgent, calm, authoritative" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Topic</label>
              <input value={config.topic} onChange={e => setConfig({ ...config, topic: e.target.value })} placeholder="e.g. salary negotiation, abandoned hospital" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Custom Instructions</label>
              <textarea value={config.custom} onChange={e => setConfig({ ...config, custom: e.target.value })} placeholder="Any additional instructions..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setStep(1)} style={{ ...btnSecondary }}>← Back</button>
            <button onClick={() => setStep(3)} style={btnPrimary}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 3: Generate */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Generate</h2>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Prompt Preview:</div>
            <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{buildPrompt()}</pre>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(2)} style={btnSecondary}>← Back</button>
            <button onClick={generate} disabled={generating} style={{ ...btnPrimary, opacity: generating ? 0.6 : 1 }}>
              {generating ? '⏳ Generating...' : '⚡ Generate Script'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Review & Edit</h2>
          <textarea
            value={editedResult}
            onChange={e => setEditedResult(e.target.value)}
            style={{
              ...inputStyle,
              width: '100%',
              minHeight: 500,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setStep(3)} style={btnSecondary}>← Regenerate</button>
            <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : '💾 Save Script'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Done */}
      {step === 5 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Script Saved!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Your script has been saved to the library.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Link href="/scripts/library" style={{ ...btnPrimary, textDecoration: 'none' }}>📚 View Library</Link>
            <button onClick={() => { setStep(1); setResult(''); setEditedResult(''); setSaved(false); setConfig({ category: '', genre: '', tone: '', topic: '', custom: '', archetype: '' }); }} style={btnSecondary}>⚡ Generate Another</button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: '0.88rem',
};
const btnPrimary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.88rem',
  fontWeight: 600,
  background: 'var(--accent)',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.88rem',
  fontWeight: 500,
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)',
  cursor: 'pointer',
};
