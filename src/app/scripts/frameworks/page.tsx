'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Framework {
  id: string;
  name: string;
  slug: string;
  description: string;
  channel: string;
  framework_type: string;
  structure: any;
  config: any;
  example_prompt: string;
  script_count: number;
  created_at: string;
}

const ICONS: Record<string, string> = { asmpro: '🎯', tension: '📖', claymation: '🎭' };

export default function FrameworksPage() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selected, setSelected] = useState<Framework | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/scripts/frameworks').then(r => r.json()).then(d => { setFrameworks(d); setLoading(false); });
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>🔧 Frameworks</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Script generation templates</p>
        </div>
        <Link href="/scripts" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>← Dashboard</Link>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '350px 1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Framework List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {frameworks.map(f => (
              <div
                key={f.id}
                onClick={() => setSelected(f)}
                style={{
                  background: 'var(--bg-surface)',
                  border: `2px solid ${selected?.id === f.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>{ICONS[f.slug] || '📝'}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {f.script_count} scripts • {f.channel}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.description}</p>
              </div>
            ))}
          </div>

          {/* Framework Detail */}
          {selected && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 20, overflow: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{ICONS[selected.slug] || '📝'} {selected.name}</h2>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <Section title="Channel" content={selected.channel} />
                <Section title="Type" content={selected.framework_type} />

                <div>
                  <h3 style={h3Style}>Sections</h3>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {(selected.structure.sections || []).map((s: any, i: number) => (
                      <div key={i} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '0.85rem' }}>[{s.name}]</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginLeft: 8 }}>{s.duration}</span>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{s.purpose}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.structure.rules && (
                  <div>
                    <h3 style={h3Style}>Rules</h3>
                    <ul style={{ paddingLeft: 18, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                      {selected.structure.rules.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}

                {selected.structure.categories && (
                  <div>
                    <h3 style={h3Style}>Categories</h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selected.structure.categories.map((c: string) => <Tag key={c} text={c} />)}
                    </div>
                  </div>
                )}

                {selected.structure.genres && (
                  <div>
                    <h3 style={h3Style}>Genres</h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selected.structure.genres.map((g: string) => <Tag key={g} text={g} />)}
                    </div>
                  </div>
                )}

                {selected.structure.archetypes && (
                  <div>
                    <h3 style={h3Style}>Archetypes</h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selected.structure.archetypes.map((a: string) => <Tag key={a} text={a} />)}
                    </div>
                  </div>
                )}

                {selected.config && Object.keys(selected.config).length > 0 && (
                  <div>
                    <h3 style={h3Style}>Config</h3>
                    <pre style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 12, fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selected.config, null, 2)}
                    </pre>
                  </div>
                )}

                {selected.example_prompt && (
                  <div>
                    <h3 style={h3Style}>Example Prompt</h3>
                    <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 12, fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      {selected.example_prompt}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 style={h3Style}>{title}</h3>
      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{content}</div>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span style={{
      background: 'var(--accent-subtle)',
      color: 'var(--accent)',
      fontSize: '0.78rem',
      fontWeight: 500,
      padding: '3px 10px',
      borderRadius: 'var(--radius-sm)',
    }}>{text}</span>
  );
}

const h3Style: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 };
