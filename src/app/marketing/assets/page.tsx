'use client';
import { useState } from 'react';

const brandGuidelines = [
  { title: 'GWDS Brand', desc: 'Gamma Waves Design Studio primary brand', color: 'var(--accent)', items: ['Logo: Gamma wave icon', 'Colors: Deep purple, electric blue', 'Font: Inter / modern sans-serif', 'Tone: Professional, innovative, tech-forward'] },
  { title: 'Honey Bunny', desc: 'Sweet content, cozy vibes', color: 'var(--amber)', items: ['Palette: Warm amber, soft pink', 'Tone: Playful, warm, relatable', 'Target: Gen-Z lifestyle'] },
  { title: 'Clay Verse', desc: 'Creative clay art content', color: 'var(--teal)', items: ['Palette: Earthy tones, teal accent', 'Tone: Creative, satisfying, ASMR', 'Target: Craft & ASMR community'] },
  { title: 'The 400 Club', desc: 'NFT collection brand', color: 'var(--purple)', items: ['Palette: Purple, gold, dark', 'Tone: Exclusive, premium, community', 'Target: Web3 / NFT collectors'] },
];

const scriptTemplates = [
  { name: 'TikTok Hook + Story', template: 'HOOK (0-3s): [Attention grabber]\nSETUP (3-8s): [Context/problem]\nPAYOFF (8-15s): [Solution/reveal]\nCTA (15-20s): [Follow/like/comment]' },
  { name: 'Product Showcase', template: 'INTRO: "You need to see this..."\nFEATURE 1: [Key benefit]\nFEATURE 2: [Unique angle]\nCLOSE: "Link in bio"' },
  { name: 'Story Time', template: 'HOOK: "Story time..."\nBUILDUP: [Set the scene]\nCLIMAX: [The moment]\nLESSON: [What I learned]' },
  { name: 'Tutorial/How-To', template: 'HOOK: "Here\'s how to [result]"\nSTEP 1: [First action]\nSTEP 2: [Second action]\nSTEP 3: [Final action]\nRESULT: [Show outcome]' },
];

const hashtagSets: Record<string, string[]> = {
  'Honey Bunny': ['#honeybunny', '#cozyvibes', '#aesthetic', '#relatable', '#fyp', '#viral', '#genz'],
  'Clay Verse': ['#clayart', '#satisfying', '#asmr', '#handmade', '#creative', '#oddlysatisfying', '#art'],
  'Hunni Bunni Kitchen': ['#cooking', '#recipe', '#foodtiktok', '#easyrecipe', '#homecooking', '#fyp'],
  'What I Need to Hear': ['#motivation', '#selflove', '#healing', '#mentalhealth', '#affirmations', '#positivity'],
  'GWDS': ['#design', '#webdesign', '#creative', '#tech', '#startup', '#ui', '#branding'],
  'The 400 Club': ['#nft', '#web3', '#nftcommunity', '#crypto', '#digitalart', '#the400club'],
};

const contentIdeas = [
  { category: 'Trending', ideas: ['Duet trending sounds', 'Green screen news reaction', 'POV trend adaptation', 'Day in the life'] },
  { category: 'Evergreen', ideas: ['How-to tutorials', 'Before/after reveals', 'Tips & tricks series', 'Behind the scenes'] },
  { category: 'Engagement', ideas: ['This or that polls', 'Comment challenges', 'Stitch reactions', 'Q&A responses'] },
  { category: 'Series', ideas: ['Daily routine', 'Weekly roundup', 'Monthly challenge', 'Transformation journey'] },
];

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<'brand' | 'scripts' | 'hashtags' | 'ideas'>('brand');

  const tabs = [
    { id: 'brand' as const, label: '🎨 Brand Guidelines' },
    { id: 'scripts' as const, label: '📝 Script Templates' },
    { id: 'hashtags' as const, label: '#️⃣ Hashtag Sets' },
    { id: 'ideas' as const, label: '💡 Content Ideas' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>🗂️ Assets Library</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Brand assets, templates, and creative resources</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none',
            background: activeTab === t.id ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Brand Guidelines */}
      {activeTab === 'brand' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {brandGuidelines.map(bg => (
            <div key={bg.title} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', padding: 20, borderTop: `3px solid ${bg.color}`,
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>{bg.title}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 12 }}>{bg.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {bg.items.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '3px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Script Templates */}
      {activeTab === 'scripts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {scriptTemplates.map(st => (
            <div key={st.name} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', padding: 20,
            }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 10 }}>{st.name}</h3>
              <pre style={{
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14,
                fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono)', lineHeight: 1.6, border: '1px solid var(--border-subtle)',
              }}>{st.template}</pre>
            </div>
          ))}
        </div>
      )}

      {/* Hashtag Sets */}
      {activeTab === 'hashtags' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {Object.entries(hashtagSets).map(([channel, tags]) => (
            <div key={channel} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', padding: 20,
            }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 10 }}>{channel}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tags.map(tag => (
                  <span key={tag} style={{
                    padding: '3px 10px', borderRadius: 100, fontSize: '0.78rem',
                    background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 500,
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Ideas */}
      {activeTab === 'ideas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {contentIdeas.map(cat => (
            <div key={cat.category} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', padding: 20,
            }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 10 }}>{cat.category}</h3>
              {cat.ideas.map((idea, i) => (
                <div key={i} style={{
                  padding: '8px 12px', marginBottom: 6, borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)', fontSize: '0.82rem', color: 'var(--text-secondary)',
                }}>💡 {idea}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
