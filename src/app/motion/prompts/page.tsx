'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Prompt {
  id: string;
  title: string;
  prompt_text: string;
  category: string;
  tags: string[];
  usage_count: number;
  is_favorite: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  launch: 'oklch(0.65 0.18 250)',
  demo: 'oklch(0.65 0.18 155)',
  showcase: 'oklch(0.65 0.18 300)',
  tiktok: 'oklch(0.65 0.2 25)',
  explainer: 'oklch(0.75 0.15 75)',
  nft: 'oklch(0.65 0.18 200)',
  custom: 'oklch(0.50 0.015 260)',
};

export default function PromptLibrary() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState('');
  
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [newTags, setNewTags] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPrompts = async () => {
    const res = await fetch('/api/motion/prompts').catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setPrompts(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const seedLibrary = async () => {
    setSeeding(true);
    const res = await fetch('/api/motion/prompts/seed', { method: 'POST' });
    if (res.ok) {
      setToast('✅ Prompt library seeded successfully!');
      setTimeout(() => setToast(''), 3000);
      loadPrompts();
    }
    setSeeding(false);
  };

  const toggleFavorite = async (id: string, currentState: boolean) => {
    await fetch(`/api/motion/prompts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !currentState }),
    });
    loadPrompts();
  };

  const addPrompt = async () => {
    if (!newTitle.trim() || !newPrompt.trim()) return;
    setSaving(true);
    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    await fetch('/api/motion/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        prompt_text: newPrompt,
        category: newCategory,
        tags,
      }),
    });
    setNewTitle('');
    setNewPrompt('');
    setNewCategory('custom');
    setNewTags('');
    setShowAddForm(false);
    setSaving(false);
    loadPrompts();
  };

  const filteredPrompts = prompts.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.prompt_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = ['All', 'Launch', 'Demo', 'Showcase', 'TikTok', 'Explainer', 'NFT', 'Custom'];

  if (loading) {
    return <div style={{padding:40,color:'oklch(0.65 0.02 260)'}}>Loading prompts...</div>;
  }

  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:'1.3rem',fontWeight:700}}>📚 Prompt Library ({filteredPrompts.length})</h1>
          <p style={{color:'oklch(0.50 0.015 260)',fontSize:'0.82rem'}}>Pre-built video generation prompts</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              ...btnSecondary,
            }}
          >
            ➕ Add Prompt
          </button>
          <button
            onClick={seedLibrary}
            disabled={seeding}
            style={{
              ...btnPrimary,
              opacity: seeding ? 0.6 : 1,
            }}
          >
            {seeding ? '⏳ Seeding...' : '🌱 Seed Library'}
          </button>
          <Link href="/motion" style={{...btnSecondary,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>← Dashboard</Link>
        </div>
      </div>

      {toast && (
        <div style={{
          position:'fixed',
          top:20,
          right:20,
          background:'oklch(0.25 0.06 155)',
          color:'oklch(0.65 0.18 155)',
          padding:'12px 20px',
          borderRadius:8,
          fontSize:'0.85rem',
          fontWeight:600,
          zIndex:1000,
        }}>
          {toast}
        </div>
      )}

      {showAddForm && (
        <div style={{
          marginBottom:24,
          padding:20,
          background:'oklch(0.17 0.015 260)',
          border:'1px solid oklch(0.28 0.015 260)',
          borderRadius:12,
        }}>
          <h3 style={{fontSize:'1rem',fontWeight:600,marginBottom:16}}>Add New Prompt</h3>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div>
              <label style={labelStyle}>Title</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Product Launch Video" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Prompt</label>
              <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="Create a dynamic product launch video..." rows={4} style={{...inputStyle,resize:'vertical'}} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inputStyle}>
                  {categories.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c.toLowerCase()}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="product, tech, modern" style={inputStyle} />
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={addPrompt} disabled={saving} style={{...btnPrimary,opacity:saving ? 0.6 : 1}}>
                {saving ? 'Saving...' : '💾 Save Prompt'}
              </button>
              <button onClick={() => setShowAddForm(false)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search prompts..."
          style={{...inputStyle,minWidth:250}}
        />
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === 'All' ? '' : cat.toLowerCase())}
              style={{
                padding:'8px 14px',
                borderRadius:8,
                fontSize:'0.82rem',
                fontWeight:600,
                background: (cat === 'All' && !categoryFilter) || categoryFilter === cat.toLowerCase() ? CATEGORY_COLORS[cat.toLowerCase()] || 'oklch(0.65 0.18 250)' : 'oklch(0.17 0.015 260)',
                color: (cat === 'All' && !categoryFilter) || categoryFilter === cat.toLowerCase() ? 'white' : 'oklch(0.65 0.02 260)',
                border:'1px solid oklch(0.28 0.015 260)',
                cursor:'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Prompts Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))',gap:16}}>
        {filteredPrompts.length === 0 ? (
          <div style={{
            gridColumn:'1 / -1',
            padding:40,
            textAlign:'center',
            color:'oklch(0.50 0.015 260)',
            background:'oklch(0.17 0.015 260)',
            border:'1px solid oklch(0.28 0.015 260)',
            borderRadius:12,
          }}>
            No prompts found. {prompts.length === 0 ? 'Click "Seed Library" to get started!' : 'Try adjusting your filters.'}
          </div>
        ) : filteredPrompts.map(p => (
          <div
            key={p.id}
            style={{
              background:'oklch(0.17 0.015 260)',
              border:'1px solid oklch(0.28 0.015 260)',
              borderRadius:12,
              padding:16,
              display:'flex',
              flexDirection:'column',
              gap:12,
              position:'relative',
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
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:8}}>
              <div style={{fontWeight:600,fontSize:'0.95rem',flex:1}}>{p.title}</div>
              <button
                onClick={() => toggleFavorite(p.id, p.is_favorite)}
                style={{
                  background:'none',
                  border:'none',
                  cursor:'pointer',
                  fontSize:'1.2rem',
                  padding:0,
                }}
              >
                {p.is_favorite ? '⭐' : '☆'}
              </button>
            </div>
            <div
              style={{
                display:'inline-block',
                padding:'4px 10px',
                borderRadius:20,
                fontSize:'0.72rem',
                fontWeight:600,
                background: CATEGORY_COLORS[p.category] + '33',
                color: CATEGORY_COLORS[p.category] || 'oklch(0.50 0.015 260)',
                alignSelf:'flex-start',
              }}
            >
              {p.category}
            </div>
            <div
              style={{
                fontSize:'0.82rem',
                color:'oklch(0.65 0.02 260)',
                lineHeight:1.5,
                overflow:'hidden',
                textOverflow:'ellipsis',
                display:'-webkit-box',
                WebkitLineClamp:3,
                WebkitBoxOrient:'vertical',
              }}
            >
              {p.prompt_text}
            </div>
            {p.tags && p.tags.length > 0 && (
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {p.tags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      padding:'2px 8px',
                      borderRadius:12,
                      fontSize:'0.7rem',
                      background:'oklch(0.22 0.014 260)',
                      color:'oklch(0.50 0.015 260)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div style={{fontSize:'0.7rem',color:'oklch(0.50 0.015 260)'}}>
              Used {p.usage_count} times
            </div>
            <button
              onClick={() => router.push(`/motion/create?prompt=${encodeURIComponent(p.prompt_text)}&title=${encodeURIComponent(p.title)}`)}
              style={{
                ...btnPrimary,
                width:'100%',
                marginTop:'auto',
              }}
            >
              ⚡ Use This Prompt
            </button>
          </div>
        ))}
      </div>
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
