'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

interface QuizScript {
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
  metadata: any;
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
  structure: any;
}

const QUIZ_CATEGORIES = [
  { key: 'speed_trivia', label: 'Speed Trivia', icon: '⚡', desc: 'Rapid-fire general knowledge' },
  { key: 'guess_the', label: 'Guess The...', icon: '🔍', desc: 'Logo, flag, movie, song, emoji' },
  { key: 'riddles', label: 'Riddles & Brain Teasers', icon: '🧩', desc: 'Logic puzzles and lateral thinking' },
  { key: 'would_you_rather', label: 'Would You Rather', icon: '🤔', desc: 'Polarizing choices that drive comments' },
  { key: 'personality', label: 'Personality Quiz', icon: '🪞', desc: 'Self-discovery and psychology' },
  { key: 'multi_level', label: 'Multi-Level Challenge', icon: '🏆', desc: 'Progressive difficulty, keeps viewers hooked' },
  { key: 'true_or_false', label: 'True or False', icon: '✅', desc: 'Surprising facts and common myths' },
  { key: 'finish_the_lyric', label: 'Finish The Lyric', icon: '🎵', desc: 'Song lyrics completion challenge' },
];

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'expert'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'var(--purple-subtle)', text: 'var(--purple)' },
  review: { bg: 'var(--amber-subtle)', text: 'var(--amber)' },
  approved: { bg: 'var(--green-subtle)', text: 'var(--green)' },
  produced: { bg: 'var(--teal-subtle)', text: 'var(--teal)' },
  published: { bg: 'oklch(0.22 0.014 260)', text: 'var(--text-tertiary)' },
};

export default function QuizDashboard() {
  const [quizFramework, setQuizFramework] = useState<Framework | null>(null);
  const [scripts, setScripts] = useState<QuizScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QuizScript | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  // TTS state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('Mark'); // Energetic voice for quizzes
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsSaving, setTtsSaving] = useState(false);
  const [ttsTemperature, setTtsTemperature] = useState(1.2); // Slightly more expressive for quizzes
  const [ttsSpeakingRate, setTtsSpeakingRate] = useState(1.1); // Slightly faster for energy
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genCategory, setGenCategory] = useState('speed_trivia');
  const [genCount, setGenCount] = useState(5);
  const [genTopic, setGenTopic] = useState('');
  const [genDifficulty, setGenDifficulty] = useState('medium');
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);

  // Load quiz framework
  useEffect(() => {
    fetch('/api/scripts/frameworks').then(r => r.json()).then((fws: Framework[]) => {
      const quiz = fws.find(f => f.slug === 'quiz');
      if (quiz) setQuizFramework(quiz);
    });
    fetch('/api/scripts/tts').then(r => r.json()).then(d => {
      if (d.voices?.length > 0) setVoices(d.voices);
    });
  }, []);

  const loadScripts = useCallback(async () => {
    if (!quizFramework) return;
    const params = new URLSearchParams();
    params.set('framework_id', quizFramework.id);
    if (filterCategory) params.set('category', filterCategory);
    if (filterStatus) params.set('status', filterStatus);
    if (search) params.set('search', search);

    let allScripts: QuizScript[] = [];
    let offset = 0;
    const pageSize = 1000;
    let totalCount = 0;

    while (true) {
      const res = await fetch(`/api/scripts?${params}&limit=${pageSize}&offset=${offset}`);
      const data = await res.json();
      const page = data.data || [];
      if (data.count) totalCount = data.count;
      allScripts = [...allScripts, ...page];
      if (page.length < pageSize) break;
      offset += pageSize;
    }

    setScripts(allScripts);
    setTotal(totalCount || allScripts.length);
  }, [quizFramework, filterCategory, filterStatus, search]);

  useEffect(() => {
    if (quizFramework) {
      loadScripts().finally(() => setLoading(false));
    }
  }, [loadScripts, quizFramework]);

  // Reset TTS on script change
  useEffect(() => {
    setTtsAudioUrl(null);
    setTtsError(null);
  }, [selected?.id]);

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
          setSelected({ ...selected, audio_url: data.audio_url });
          loadScripts();
        }
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setTtsAudioUrl(url);
        setTimeout(() => {
          if (audioPreviewRef.current) audioPreviewRef.current.playbackRate = ttsSpeakingRate;
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

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/scripts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    loadScripts();
    if (selected?.id === id) setSelected({ ...selected!, status });
  };

  const deleteScript = async (id: string) => {
    if (!confirm('Delete this quiz script?')) return;
    await fetch('/api/scripts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (selected?.id === id) setSelected(null);
    loadScripts();
  };

  const printQuizScript = (script: QuizScript, mode: 'film' | 'notes' = 'film') => {
    const catInfo = QUIZ_CATEGORIES.find(c => c.key === script.category);
    const difficulty = script.metadata?.difficulty || 'medium';
    const parsed = parseScriptToQuestions(script.script_content);
    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    if (!printWindow) return;

    if (mode === 'film') {
      // ── FILM-READY FORMAT ──
      // Big text, vertical options, generous spacing for pen crossing out on camera
      // NO answer key on this page — this is what goes on camera
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>${escapeHtml(script.title)} — Film</title>
<style>
  @page { size: letter; margin: 0.6in 0.7in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', 'Helvetica Neue', sans-serif; color: #000; line-height: 1.4; }

  .title { font-size: 22pt; font-weight: 900; text-align: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 3px solid #000; letter-spacing: -0.5px; }

  .q-block { margin-bottom: 28px; page-break-inside: avoid; }
  .q-num { font-size: 11pt; font-weight: 800; color: #666; margin-bottom: 4px; }
  .q-text { font-size: 16pt; font-weight: 800; margin-bottom: 12px; line-height: 1.3; }

  .opts { display: flex; flex-direction: column; gap: 10px; }
  .opt-row { display: flex; align-items: center; gap: 14px; padding: 10px 16px; border: 2px solid #ccc; border-radius: 8px; font-size: 14pt; font-weight: 600; min-height: 44px; }
  .opt-letter { font-weight: 900; font-size: 16pt; min-width: 30px; height: 30px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .opt-text { flex: 1; }

  .divider { border: none; border-top: 1px solid #ddd; margin: 20px 0; }

  .no-print-bar { background: #111; color: #fff; padding: 10px 20px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
  .no-print-bar button { border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 13px; margin-left: 8px; }

  @media print {
    .no-print-bar { display: none !important; }
  }
</style>
</head>
<body>

<div class="no-print-bar">
  <span>🎬 Film-Ready Quiz Sheet — overhead camera, cross out wrong answers</span>
  <div>
    <button onclick="window.print()" style="background:#16a34a;color:#fff">🖨️ Print</button>
    <button onclick="window.close()" style="background:#444;color:#fff">Close</button>
  </div>
</div>

<div style="height:8px"></div>

<div class="title">${escapeHtml(script.title.replace(/^\*+\s*/, '').replace(/\s*\*+$/, ''))}</div>

${parsed.questions.length > 0 ? parsed.questions.map((q, i) => `
<div class="q-block">
  <div class="q-num">Q${i + 1}</div>
  <div class="q-text">${escapeHtml(q.question)}</div>
  ${q.options.length > 0 ? `<div class="opts">
${q.options.map(o => `    <div class="opt-row">
      <span class="opt-letter">${o.letter}</span>
      <span class="opt-text">${escapeHtml(o.text)}</span>
    </div>`).join('\n')}
  </div>` : ''}
</div>
${i < parsed.questions.length - 1 ? '<hr class="divider">' : ''}`).join('\n') : `<p style="font-size:14pt;text-align:center;color:#999;padding:40px">No questions parsed from this script.</p>`}

</body></html>`);
    } else {
      // ── PRODUCTION NOTES FORMAT ──
      // Includes answer key, TTS script, music/visual notes
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>${escapeHtml(script.title)} — Notes</title>
<style>
  @page { size: letter; margin: 0.5in 0.6in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #111; line-height: 1.45; font-size: 10.5pt; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; margin-bottom: 12px; border-bottom: 3px solid #000; }
  .header h1 { font-size: 16pt; font-weight: 900; max-width: 75%; line-height: 1.2; }
  .header-meta { font-size: 7.5pt; color: #888; text-align: right; line-height: 1.35; }
  .info-bar { display: flex; gap: 16px; margin-bottom: 14px; padding: 6px 10px; background: #f3f3f3; border-radius: 3px; font-size: 8pt; flex-wrap: wrap; }
  .info-bar .tag { font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-right: 3px; }

  .q-card { margin-bottom: 14px; page-break-inside: avoid; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
  .q-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
  .q-head .num { font-weight: 900; font-size: 9pt; color: #6b7280; text-transform: uppercase; }
  .q-body { }
  .q-text { font-size: 11pt; font-weight: 700; margin-bottom: 6px; line-height: 1.35; }
  .options { display: flex; flex-direction: column; gap: 5px; margin-bottom: 6px; }
  .opt { display: flex; align-items: center; gap: 10px; border: 1.5px solid #e5e7eb; border-radius: 5px; padding: 7px 12px; font-size: 10.5pt; }
  .opt .ltr { font-weight: 900; font-size: 12pt; min-width: 26px; height: 26px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .opt.correct { border-color: #16a34a; background: #f0fdf4; }
  .opt.correct .ltr { background: #16a34a; color: #fff; }
  .ans { margin-top: 6px; padding-top: 5px; border-top: 1px dashed #d1d5db; display: flex; align-items: baseline; gap: 6px; font-size: 8.5pt; }
  .ans .key { font-weight: 900; color: #16a34a; font-size: 9.5pt; }
  .ans .expl { color: #6b7280; }

  .section { margin-bottom: 14px; page-break-inside: avoid; }
  .section h2 { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid #e5e7eb; }
  .section pre { font-family: 'Segoe UI', sans-serif; white-space: pre-wrap; word-break: break-word; font-size: 9pt; line-height: 1.55; color: #374151; }
  .tts-box { background: #fafafe; border: 1px solid #e0e0ee; border-radius: 4px; padding: 10px 12px; font-size: 9pt; line-height: 1.6; }
  .footer { margin-top: 16px; padding-top: 8px; border-top: 2px solid #000; font-size: 7pt; color: #aaa; display: flex; justify-content: space-between; }
  .no-print-bar { background: #18181b; color: #fff; padding: 10px 20px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
  .no-print-bar button { border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 13px; margin-left: 8px; }
  @media print { .no-print-bar { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="no-print-bar">
  <span>📋 Production Notes — answer key + TTS + prompts</span>
  <div>
    <button onclick="window.print()" style="background:#3b82f6;color:#fff">🖨️ Print</button>
    <button onclick="window.close()" style="background:#444;color:#fff">Close</button>
  </div>
</div>
<div style="height:6px"></div>
<div class="header">
  <h1>${escapeHtml(script.title)}</h1>
  <div class="header-meta">GWDS Quiz Channel<br>${new Date(script.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
</div>
<div class="info-bar">
  <div><span class="tag">Type:</span> ${catInfo?.icon || '🧠'} ${catInfo?.label || script.category}</div>
  <div><span class="tag">Difficulty:</span> ${difficulty.toUpperCase()}</div>
  <div><span class="tag">Questions:</span> ${parsed.questions.length || '—'}</div>
</div>

${parsed.questions.length > 0 ? parsed.questions.map((q, i) => `
<div class="q-card">
  <div class="q-head"><span class="num">${q.label || `Q${i + 1}`}</span></div>
  <div class="q-body">
    <div class="q-text">${escapeHtml(q.question)}</div>
    ${q.options.length > 0 ? `<div class="options">
${q.options.map(o => `      <div class="opt${o.correct ? ' correct' : ''}"><span class="ltr">${o.letter}</span><span>${escapeHtml(o.text)}</span></div>`).join('\n')}
    </div>` : ''}
    ${q.answer ? `<div class="ans"><span class="key">✅ ${escapeHtml(q.answer)}</span>${q.explanation ? `<span class="expl">${escapeHtml(q.explanation)}</span>` : ''}</div>` : ''}
  </div>
</div>`).join('\n') : `<div class="section"><h2>Full Script</h2><pre>${escapeHtml(script.script_content)}</pre></div>`}

${script.tts_content ? `<div class="section" style="margin-top:14px"><h2>🎙️ TTS Narration</h2><div class="tts-box">${escapeHtml(script.tts_content)}</div></div>` : ''}
${script.music_prompt ? `<div class="section"><h2>🎵 Music / SFX</h2><pre>${escapeHtml(script.music_prompt)}</pre></div>` : ''}
${script.video_prompt ? `<div class="section"><h2>🎬 Visual Notes</h2><pre>${escapeHtml(script.video_prompt)}</pre></div>` : ''}
<div class="footer"><span>GWDS Quiz Channel — Production Notes</span><span>${new Date().toLocaleDateString()}</span></div>
</body></html>`);
    }

    printWindow.document.close();
    // Auto-trigger print after render
    printWindow.onload = () => {
      setTimeout(() => printWindow.print(), 500);
    };
  };

  const generateBatch = async () => {
    if (!quizFramework) return;
    setGenerating(true);
    setGenError('');
    setGenSuccess('');

    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework_id: quizFramework.id,
          prompt: buildQuizPrompt(genCategory, genCount, genTopic, genDifficulty),
          generation_params: { category: genCategory, count: genCount, topic: genTopic, difficulty: genDifficulty },
        }),
      });

      const data = await res.json();
      if (data.error) {
        setGenError(data.error);
        return;
      }

      // Parse the generated content into individual quiz scripts
      const parsed = parseQuizBatch(data.content, genCategory, genDifficulty);
      let savedCount = 0;

      for (const quiz of parsed) {
        const wordCount = quiz.script_content.split(/\s+/).filter(Boolean).length;
        const saveRes = await fetch('/api/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: quiz.title,
            framework_id: quizFramework.id,
            category: genCategory,
            status: 'draft',
            script_content: quiz.script_content,
            tts_content: quiz.tts_content || null,
            music_prompt: quiz.music_prompt || null,
            video_prompt: quiz.video_prompt || null,
            visual_prompts: quiz.visual_prompts || [],
            word_count: wordCount,
            estimated_duration_secs: Math.round(wordCount / 2.5),
            tags: ['quiz', genCategory, genDifficulty, ...(genTopic ? [genTopic.toLowerCase()] : [])],
            metadata: { quiz_type: genCategory, difficulty: genDifficulty, topic: genTopic, question_count: quiz.question_count || genCount },
          }),
        });
        if (saveRes.ok) savedCount++;
      }

      setGenSuccess(`Generated and saved ${savedCount} quiz script${savedCount !== 1 ? 's' : ''}`);
      loadScripts();
    } catch (e: any) {
      setGenError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // Category stats
  const categoryCounts: Record<string, number> = {};
  scripts.forEach(s => {
    const cat = s.category || 'uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const scriptsWithAudio = scripts.filter(s => s.audio_url);

  if (!quizFramework && !loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🧠</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Quiz Framework Not Found</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          The quiz framework needs to be set up first. Run the setup to create it.
        </p>
        <button
          onClick={async () => {
            const res = await fetch('/api/scripts/setup-quiz', { method: 'POST' });
            const data = await res.json();
            if (data.error) alert(data.error);
            else window.location.reload();
          }}
          style={btnPrimary}
        >
          🚀 Set Up Quiz Framework
        </button>
        <div style={{ marginTop: 16 }}>
          <Link href="/scripts" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>← Back to Scripts</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>🧠 Quiz Questions</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>{total} quiz scripts across {Object.keys(categoryCounts).length} categories</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowGenerator(!showGenerator)} style={{ ...btnPrimary, background: showGenerator ? 'var(--bg-elevated)' : 'var(--accent)', color: showGenerator ? 'var(--text-primary)' : '#fff' }}>
            {showGenerator ? '✕ Close' : '⚡ Generate Quiz'}
          </button>
          <Link href="/scripts" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>← Scripts</Link>
        </div>
      </div>

      {/* Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div
          onClick={() => setFilterCategory('')}
          style={{
            background: !filterCategory ? 'var(--accent-subtle)' : 'var(--bg-surface)',
            border: `1px solid ${!filterCategory ? 'var(--accent)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20 }}>📊</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>All</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{total}</div>
        </div>
        {QUIZ_CATEGORIES.map(cat => (
          <div
            key={cat.key}
            onClick={() => setFilterCategory(filterCategory === cat.key ? '' : cat.key)}
            style={{
              background: filterCategory === cat.key ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              border: `1px solid ${filterCategory === cat.key ? 'var(--accent)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'border-color var(--transition-fast)',
            }}
          >
            <div style={{ fontSize: 20 }}>{cat.icon}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: 2 }}>{cat.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{categoryCounts[cat.key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Generator Panel */}
      {showGenerator && (
        <div style={{
          marginBottom: 20,
          padding: 20,
          background: 'linear-gradient(135deg, oklch(0.16 0.025 160), oklch(0.14 0.015 200))',
          border: '1px solid oklch(0.35 0.06 160 / 0.4)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>⚡ Generate Quiz Batch</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Quiz Type</label>
              <select value={genCategory} onChange={e => setGenCategory(e.target.value)} style={inputStyle}>
                {QUIZ_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select value={genDifficulty} onChange={e => setGenDifficulty(e.target.value)} style={inputStyle}>
                {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Questions per Video</label>
              <select value={genCount} onChange={e => setGenCount(parseInt(e.target.value))} style={inputStyle}>
                {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Topic (optional)</label>
              <input value={genTopic} onChange={e => setGenTopic(e.target.value)} placeholder="e.g. world capitals, 90s movies, science" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={generateBatch} disabled={generating} style={{ ...btnPrimary, opacity: generating ? 0.6 : 1 }}>
              {generating ? '⏳ Generating...' : '🚀 Generate'}
            </button>
            {genError && <span style={{ fontSize: '0.82rem', color: 'oklch(0.8 0.12 25)' }}>⚠️ {genError}</span>}
            {genSuccess && <span style={{ fontSize: '0.82rem', color: 'oklch(0.8 0.12 145)' }}>✅ {genSuccess}</span>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..." style={{ ...inputStyle, minWidth: 200 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="">All Statuses</option>
          {['draft', 'review', 'approved', 'produced', 'published'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {scriptsWithAudio.length > 0 && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>🔊 {scriptsWithAudio.length} with audio</span>
        )}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Script List */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
          {loading ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : scripts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
              <p>No quiz scripts yet. Hit ⚡ Generate Quiz to create some.</p>
            </div>
          ) : scripts.map((s, i) => {
            const catInfo = QUIZ_CATEGORIES.find(c => c.key === s.category);
            const diff = s.metadata?.difficulty;
            return (
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
                <div style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.audio_url ? '🔊 ' : ''}{catInfo?.icon || '🧠'} {s.title}
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text-tertiary)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {catInfo && <span>{catInfo.label}</span>}
                  {diff && <DifficultyBadge difficulty={diff} />}
                  <span>• {s.word_count}w</span>
                  <span>• {s.estimated_duration_secs}s</span>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'auto', maxHeight: 'calc(100vh - 340px)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{selected.title}</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>{QUIZ_CATEGORIES.find(c => c.key === selected.category)?.label || selected.category}</span>
                  {selected.metadata?.difficulty && <DifficultyBadge difficulty={selected.metadata.difficulty} />}
                  <span>• {selected.word_count} words</span>
                  <span>• {selected.estimated_duration_secs}s</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => printQuizScript(selected, 'film')} style={{ background: 'oklch(0.45 0.14 145)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>🎬 Print for Film</button>
                <button onClick={() => printQuizScript(selected, 'notes')} style={{ background: 'oklch(0.35 0.08 230)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>📋 Print Notes</button>
                <button onClick={() => deleteScript(selected.id)} style={{ background: 'none', border: 'none', color: 'oklch(0.6 0.1 25)', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️</button>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
            </div>

            {/* Status */}
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

            {/* TTS Section */}
            <div style={{ marginBottom: 16, padding: 14, background: 'linear-gradient(135deg, oklch(0.18 0.02 160), oklch(0.16 0.015 200))', border: '1px solid oklch(0.35 0.04 160 / 0.4)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600 }}>🎙️ Quiz Audio</h3>
                {selected.audio_url && <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600 }}>✅ Audio saved</span>}
              </div>

              {selected.audio_url && (
                <div style={{ marginBottom: 10 }}>
                  <audio controls src={selected.audio_url} style={{ width: '100%', height: 36, marginBottom: 6 }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} style={{ ...inputStyle, fontSize: '0.78rem', padding: '6px 8px', minWidth: 180 }}>
                  {voices.filter(v => v.category === 'en').map(v => (
                    <option key={v.voice_id} value={v.voice_id}>{v.name} — {v.description?.slice(0, 50)}</option>
                  ))}
                </select>
                <button onClick={generateTts} disabled={ttsLoading} style={{
                  ...smallBtnStyle, background: ttsLoading ? 'var(--bg-elevated)' : 'oklch(0.55 0.15 160)', color: '#fff', fontWeight: 600, border: 'none', padding: '6px 14px',
                }}>
                  {ttsLoading ? '⏳...' : '🔊 Generate Audio'}
                </button>
              </div>

              {/* Sliders */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>
                    <span>🌡 Temperature</span><span>{ttsTemperature.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0.6} max={1.5} step={0.01} value={ttsTemperature} onChange={e => setTtsTemperature(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'oklch(0.6 0.18 160)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>
                    <span>⚡ Speed</span><span>{ttsSpeakingRate.toFixed(2)}x</span>
                  </div>
                  <input type="range" min={0.5} max={2.0} step={0.05} value={ttsSpeakingRate} onChange={e => {
                    const rate = parseFloat(e.target.value);
                    setTtsSpeakingRate(rate);
                    if (audioPreviewRef.current) audioPreviewRef.current.playbackRate = rate;
                  }} style={{ width: '100%', accentColor: 'oklch(0.6 0.18 160)' }} />
                </div>
              </div>

              {ttsError && <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'oklch(0.8 0.1 25)' }}>⚠️ {ttsError}</div>}

              {ttsAudioUrl && (
                <div style={{ marginTop: 10 }}>
                  <audio ref={audioPreviewRef} controls src={ttsAudioUrl} style={{ width: '100%', height: 36, marginBottom: 8 }} onLoadedMetadata={e => { (e.target as HTMLAudioElement).playbackRate = ttsSpeakingRate; }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={saveTtsAudio} disabled={ttsSaving} style={{ ...smallBtnStyle, background: 'oklch(0.45 0.12 145)', color: '#fff', fontWeight: 600, border: 'none' }}>
                      {ttsSaving ? '⏳...' : '💾 Save Audio'}
                    </button>
                    <button onClick={() => {
                      const a = document.createElement('a');
                      a.href = ttsAudioUrl;
                      a.download = `${selected.title?.replace(/[^a-z0-9]/gi, '_') || 'quiz'}.mp3`;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    }} style={{ ...smallBtnStyle, background: 'oklch(0.35 0.08 230)', color: '#fff', fontWeight: 600, border: 'none' }}>⬇️ Download</button>
                  </div>
                </div>
              )}
            </div>

            {/* Script Content */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Script</h3>
                <CopyButton text={selected.script_content} />
              </div>
              <pre style={preStyle}>{selected.script_content}</pre>
            </div>

            {selected.tts_content && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>TTS Version</h3>
                  <CopyButton text={selected.tts_content} />
                </div>
                <pre style={preStyle}>{selected.tts_content}</pre>
              </div>
            )}

            {selected.video_prompt && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>🎬 Video Prompt</h3>
                  <CopyButton text={selected.video_prompt} />
                </div>
                <pre style={{ ...preStyle, fontSize: '0.8rem' }}>{selected.video_prompt}</pre>
              </div>
            )}

            {selected.music_prompt && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>🎵 Music Prompt</h3>
                  <CopyButton text={selected.music_prompt} />
                </div>
                <pre style={{ ...preStyle, fontSize: '0.8rem' }}>{selected.music_prompt}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    easy: { bg: 'oklch(0.25 0.08 145 / 0.4)', text: 'oklch(0.8 0.12 145)' },
    medium: { bg: 'oklch(0.25 0.08 80 / 0.4)', text: 'oklch(0.8 0.12 80)' },
    hard: { bg: 'oklch(0.25 0.08 25 / 0.4)', text: 'oklch(0.8 0.12 25)' },
    expert: { bg: 'oklch(0.25 0.08 320 / 0.4)', text: 'oklch(0.8 0.12 320)' },
  };
  const c = colors[difficulty] || colors.medium;
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-sm)', textTransform: 'uppercase' }}>
      {difficulty}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-sm)', textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => { e.stopPropagation(); await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: copied ? 'oklch(0.35 0.1 145 / 0.4)' : 'oklch(0.25 0.02 260 / 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: copied ? 'oklch(0.8 0.12 145)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px' }}
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}

// ─── Print Helpers ──────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ParsedQuestion {
  label: string;
  question: string;
  options: Array<{ letter: string; text: string; correct: boolean }>;
  answer: string;
  explanation: string;
  timer: string;
}

interface ParsedQuiz {
  hook: string;
  questions: ParsedQuestion[];
  cta: string;
}

function parseScriptToQuestions(content: string): ParsedQuiz {
  const result: ParsedQuiz = { hook: '', questions: [], cta: '' };

  // Extract hook
  const hookMatch = content.match(/\[HOOK\]\s*([\s\S]*?)(?=\n\s*(?:\[|Question|Q\d|Round|Level|Riddle|Statement|#|\d+[\.\)]))/i);
  if (hookMatch) result.hook = hookMatch[1].trim().replace(/^["']|["']$/g, '');

  // Extract CTA
  const ctaMatch = content.match(/\[CTA\]\s*([\s\S]*?)(?:\n\s*===|$)/i);
  if (ctaMatch) result.cta = ctaMatch[1].trim().replace(/^["']|["']$/g, '');

  // Strip everything after === INWORLD TTS === or === VISUAL to only parse quiz section
  let quizSection = content.replace(/===\s*(?:INWORLD TTS|VISUAL|MUSIC|SUNO|NEXT)[\s\S]*$/i, '').trim();

  // Extract answer key if present (=== ANSWER KEY === section)
  const answerKeyMatch = content.match(/===\s*ANSWER KEY\s*===([\s\S]*?)(?:===|$)/i);
  const answerKeyMap: Record<number, { letter: string; explanation: string }> = {};
  if (answerKeyMatch) {
    const keyLines = answerKeyMatch[1].trim().split('\n');
    for (const kl of keyLines) {
      const m = kl.match(/Q(\d+)\s*:\s*\*?\*?\s*([A-Da-d])\s*[-–—]\s*(.+)/i);
      if (m) {
        answerKeyMap[parseInt(m[1])] = {
          letter: m[2].toUpperCase(),
          explanation: m[3].replace(/\*+/g, '').trim(),
        };
      }
    }
    // Remove answer key from quiz section so it doesn't interfere with question parsing
    quizSection = quizSection.replace(/===\s*ANSWER KEY\s*===[\s\S]*$/i, '').trim();
  }

  // Try multiple question patterns

  // Pattern 1: "### QUESTION 1 - Topic" or "QUESTION 1:" or "Q1." or "Q1:" etc
  const questionBlocks = quizSection.split(/(?:^|\n)\s*#{0,4}\s*(?:QUESTION|Q|Round|Level|Riddle|Statement)\s*(\d+)\s*[-:.\)]\s*/gi);

  if (questionBlocks.length > 1) {
    for (let i = 1; i < questionBlocks.length; i += 2) {
      const num = questionBlocks[i];
      const block = questionBlocks[i + 1] || '';
      const q = parseQuestionBlock(block, parseInt(num));
      if (q) result.questions.push(q);
    }
  }

  // Pattern 2: "1." or "1)" numbered list (must contain a ?)
  if (result.questions.length === 0) {
    const numberedBlocks = quizSection.split(/(?:^|\n)\s*(\d+)\s*[\.\)]\s+/);
    if (numberedBlocks.length > 2) {
      for (let i = 1; i < numberedBlocks.length; i += 2) {
        const num = numberedBlocks[i];
        const block = numberedBlocks[i + 1] || '';
        if (block.match(/[?]/)) {
          const q = parseQuestionBlock(block, parseInt(num));
          if (q) result.questions.push(q);
        }
      }
    }
  }

  // Pattern 3: "**Question 1**" markdown bold
  if (result.questions.length === 0) {
    const boldBlocks = quizSection.split(/\*\*(?:Question|Q|Round|Level)\s*(\d+)\*\*/gi);
    if (boldBlocks.length > 1) {
      for (let i = 1; i < boldBlocks.length; i += 2) {
        const num = boldBlocks[i];
        const block = boldBlocks[i + 1] || '';
        const q = parseQuestionBlock(block, parseInt(num));
        if (q) result.questions.push(q);
      }
    }
  }

  // Apply answer key to questions that don't have answers yet
  if (Object.keys(answerKeyMap).length > 0) {
    result.questions.forEach((q, i) => {
      const qNum = i + 1;
      const ak = answerKeyMap[qNum];
      if (ak) {
        if (!q.answer) q.answer = ak.letter;
        if (!q.explanation) q.explanation = ak.explanation;
        // Mark correct option
        q.options.forEach(o => { if (o.letter === ak.letter) o.correct = true; });
      }
    });
  }

  return result;
}

function parseQuestionBlock(block: string, num: number): ParsedQuestion | null {
  const rawLines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return null;

  const options: Array<{ letter: string; text: string; correct: boolean }> = [];
  let questionText = '';
  let answer = '';
  let explanation = '';
  let timer = '3s';

  // Find the actual question text (line containing ?)
  for (const line of rawLines) {
    const cleaned = line.replace(/^\*\*|\*\*$/g, '').replace(/^["']|["']$/g, '').replace(/^#+\s*/, '').trim();
    if (cleaned.includes('?') && cleaned.length > 10 && !cleaned.match(/^(?:REVEAL|Answer|Correct|Timer)/i)) {
      questionText = cleaned;
      break;
    }
  }
  if (!questionText) {
    questionText = rawLines[0].replace(/^\*\*|\*\*$/g, '').replace(/^["']|["']$/g, '').replace(/^#+\s*/, '').trim();
  }

  for (const rawLine of rawLines) {
    // Strip markdown list prefix: "- ", "* ", "• "
    const line = rawLine.replace(/^[-*•]\s+/, '').trim();

    // Check for INLINE options first: "A) Sydney   B) Melbourne   C) Canberra   D) Brisbane"
    // Multiple options on one line separated by spaces/tabs
    const inlineMatch = line.match(/([A-Da-d])\s*[\)\]\.]\s*\S+.*?(?:\s{2,}|\t).*?([A-Da-d])\s*[\)\]\.]/);
    if (inlineMatch) {
      // Split by option letter pattern
      const optParts = line.split(/(?=\s*[A-Da-d]\s*[\)\]\.]\s*)/g).filter(s => s.trim());
      for (const part of optParts) {
        const m = part.trim().match(/^([A-Da-d])\s*[\)\]\.]\s*(.+)/);
        if (m) {
          const letter = m[1].toUpperCase();
          const text = m[2].replace(/\s*[✅✓☑️⬅️←]+\s*(?:\(correct\))?$/i, '').replace(/\*+$/,'').trim();
          const isCorrect = /[✅✓☑️]|correct|\(correct\)|⬅️|←/.test(part);
          options.push({ letter, text, correct: isCorrect });
        }
      }
      continue;
    }

    // Match single option per line: "A) text", "- A) text", "(A) text"
    const optMatch = line.match(/^[\(\[]?\s*([A-Da-d])\s*[\)\]\.:\-]\s*(.+)/);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase();
      const text = optMatch[2].replace(/\s*[✅✓☑️⬅️←]+\s*(?:\(correct\))?$/i, '').replace(/\*+$/,'').trim();
      const isCorrect = /[✅✓☑️]|correct|\(correct\)|⬅️|←/.test(rawLine);
      options.push({ letter, text, correct: isCorrect });
      continue;
    }

    // Match REVEAL lines: "**REVEAL:** ✅ **B - Vatican City!**"
    const revealMatch = rawLine.match(/\*?\*?REVEAL\*?\*?\s*:?\s*[✅]?\s*\*?\*?\s*([A-Da-d])\s*[-–—]\s*(.+)/i);
    if (revealMatch) {
      const letterPart = revealMatch[1].toUpperCase();
      answer = letterPart;
      explanation = revealMatch[2].replace(/\*+/g, '').replace(/!?\s*$/, '').trim();
      if (options.length > 0) {
        options.forEach(o => { if (o.letter === letterPart) o.correct = true; });
      }
      continue;
    }

    // Match "Answer: C", "Correct: B", "✅ C" style
    const ansMatch = rawLine.match(/(?:Answer|Correct|Correct Answer|✅)\s*[:\-]?\s*\*?\*?\s*([A-Da-d])\s*[-–—.\s]*(.*)$/i);
    if (ansMatch) {
      answer = ansMatch[1].toUpperCase();
      explanation = ansMatch[2].replace(/\*+/g, '').replace(/^[\.\-–—:\s!]+/, '').trim();
      if (options.length > 0) {
        options.forEach(o => { if (o.letter === answer) o.correct = true; });
      }
      continue;
    }

    // Timer
    const timerMatch = rawLine.match(/(?:Timer|⏱|Time|timer)\s*[:\-]?\s*(\d+)\s*[-\s]*s/i);
    if (timerMatch) {
      timer = `${timerMatch[1]}s`;
    }
  }

  return {
    label: `Q${num}`,
    question: questionText,
    options,
    answer,
    explanation,
    timer,
  };
}

// ─── Prompt & Parsing ───────────────────────────────────────────────────────

function buildQuizPrompt(category: string, count: number, topic: string, difficulty: string): string {
  const topicLine = topic ? `Topic/Theme: ${topic}` : 'Topic: General knowledge (varied subjects)';

  const formatGuides: Record<string, string> = {
    speed_trivia: `Generate a paper checklist quiz for TikTok — SPEED TRIVIA format.
${count} rapid-fire general knowledge questions with 4 multiple choice options (A-D).
Each question needs a clear correct answer and 3 plausible wrong answers.
Make answers surprising where possible — include at least 2 "wait, really?" moments.
${topicLine}
Difficulty: ${difficulty}`,

    guess_the: `Generate a paper checklist quiz for TikTok — GUESS THE format.
${count} "Guess The..." challenges with 4 options each.
Types to mix: Guess the country by its outline, Guess the brand by its slogan, Guess the movie by a one-line plot description, Guess the animal by a fun fact.
Each question should be visual/descriptive enough that it works as text on paper.
${topicLine}
Difficulty: ${difficulty}`,

    riddles: `Generate a paper checklist quiz for TikTok — RIDDLES AND BRAIN TEASERS.
${count} riddles or logic puzzles with multiple choice answers (A-D).
Start with 1-2 easier ones for confidence, then escalate to ones that trip people up.
Include wordplay, lateral thinking, and math tricks.
Hook the viewer with "Only 3% of people get ALL of these right."
${topicLine}
Difficulty: ${difficulty}`,

    would_you_rather: `Generate a paper checklist quiz for TikTok — WOULD YOU RATHER.
${count} genuinely polarizing "Would You Rather" scenarios.
Format as "Would you rather A or B?" — both options should have real appeal and real downsides.
Make them conversation starters that people will ARGUE about in comments.
Include a mix: silly ones, deep ones, impossible ones.
${topicLine}
Difficulty: ${difficulty} (complexity of dilemmas)`,

    personality: `Generate a paper checklist quiz for TikTok — PERSONALITY QUIZ.
Title format: "What Kind of [X] Are You?" or "What Does Your [Choice] Say About You?"
${count} scenario-based questions with 3-4 options each.
At the bottom: scoring key with 3-4 personality result descriptions.
Make it feel like a magazine quiz — fun, shareable, makes people tag friends.
${topicLine}
Difficulty: ${difficulty}`,

    multi_level: `Generate a paper checklist quiz for TikTok — MULTI-LEVEL CHALLENGE.
${count} questions with PROGRESSIVE difficulty labeled Level 1 through Level ${count}.
Level 1 should be almost free, final level should stump most people.
Frame it: "How far can you get?" with benchmarks like "Level 3 = average, Level 5 = genius."
${topicLine}
Difficulty: progressive from easy to ${difficulty}`,

    true_or_false: `Generate a paper checklist quiz for TikTok — TRUE OR FALSE.
${count} statements that are either true or false, printed as a checklist.
Focus on genuinely SURPRISING facts — stuff that sounds fake but is true, or sounds true but is fake.
The goal is "wait, WHAT?" moments that make people rewatch and share.
${topicLine}
Difficulty: ${difficulty}`,

    finish_the_lyric: `Generate a paper checklist quiz for TikTok — FINISH THE LYRIC.
${count} song lyric challenges with 4 options for the missing words.
Format: "I got my mind on my money and my ___" A) heart B) money on my mind C) eyes on the prize D) hands in the air
Mix popular songs across decades. Include current hits and all-time classics.
${topicLine}
Difficulty: ${difficulty}`,
  };

  return formatGuides[category] || formatGuides.speed_trivia;
}

function parseQuizBatch(content: string, category: string, difficulty: string): Array<{
  title: string;
  script_content: string;
  tts_content: string | null;
  music_prompt: string | null;
  video_prompt: string | null;
  visual_prompts: any[];
  question_count: number;
}> {
  // Try to split by quiz separator markers
  const quizBlocks = content.split(/(?:^|\n)={3,}\s*(?:QUIZ|VIDEO)\s*\d*\s*={3,}/i).filter(b => b.trim());

  if (quizBlocks.length <= 1) {
    // Single quiz — extract TTS section
    const ttsMatch = content.match(/=== (?:INWORLD TTS|TTS)[^=]*===\s*([\s\S]*?)(?:===|$)/i);
    const musicMatch = content.match(/=== (?:MUSIC|SUNO)[^=]*===\s*([\s\S]*?)(?:===|$)/i);
    const videoMatch = content.match(/=== (?:VIDEO|VISUAL)[^=]*===\s*([\s\S]*?)(?:===|$)/i);
    const titleMatch = content.match(/(?:Title|Quiz):\s*(.+)/i);

    const catInfo = QUIZ_CATEGORIES.find(c => c.key === category);
    const title = titleMatch ? titleMatch[1].trim() : `${catInfo?.label || 'Quiz'} — ${difficulty} — ${new Date().toLocaleDateString()}`;

    return [{
      title,
      script_content: content,
      tts_content: ttsMatch ? ttsMatch[1].trim() : null,
      music_prompt: musicMatch ? musicMatch[1].trim() : null,
      video_prompt: videoMatch ? videoMatch[1].trim() : null,
      visual_prompts: [],
      question_count: (content.match(/(?:Question|Q|Level|Round|Riddle|Statement)\s*\d+/gi) || []).length || 5,
    }];
  }

  // Multiple quizzes
  return quizBlocks.map((block, i) => {
    const ttsMatch = block.match(/=== (?:INWORLD TTS|TTS)[^=]*===\s*([\s\S]*?)(?:===|$)/i);
    const musicMatch = block.match(/=== (?:MUSIC|SUNO)[^=]*===\s*([\s\S]*?)(?:===|$)/i);
    const videoMatch = block.match(/=== (?:VIDEO|VISUAL)[^=]*===\s*([\s\S]*?)(?:===|$)/i);
    const titleMatch = block.match(/(?:Title|Quiz):\s*(.+)/i);

    const catInfo = QUIZ_CATEGORIES.find(c => c.key === category);
    const title = titleMatch ? titleMatch[1].trim() : `${catInfo?.label || 'Quiz'} #${i + 1} — ${difficulty}`;

    return {
      title,
      script_content: block.trim(),
      tts_content: ttsMatch ? ttsMatch[1].trim() : null,
      music_prompt: musicMatch ? musicMatch[1].trim() : null,
      video_prompt: videoMatch ? videoMatch[1].trim() : null,
      visual_prompts: [],
      question_count: (block.match(/(?:Question|Q|Level|Round|Riddle|Statement)\s*\d+/gi) || []).length || 5,
    };
  });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  minWidth: 140,
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 4,
};

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.75rem',
  border: '1px solid var(--border-subtle)',
  cursor: 'pointer',
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
