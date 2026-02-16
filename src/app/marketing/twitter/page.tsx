'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Tweet {
  id: string;
  project: string;
  content: string;
  tweet_type: string;
  category: string | null;
  hashtags: string[] | null;
  media_notes: string | null;
  scheduled_for: string | null;
  status: string;
  engagement_notes: string | null;
  thread_position: number | null;
  thread_id: string | null;
  created_at: string;
  updated_at: string;
}

const categoryColors: Record<string, string> = {
  hype: 'var(--rose)',
  community: 'var(--green)',
  education: 'var(--accent)',
  'behind-scenes': 'var(--purple)',
  countdown: 'var(--amber)',
  collab: 'var(--teal)',
};

const categoryLabels: Record<string, string> = {
  hype: '🔥 Hype',
  community: '🤝 Community',
  education: '📚 Education',
  'behind-scenes': '🎨 Behind Scenes',
  countdown: '⏰ Countdown',
  collab: '🤝 Collab',
};

const statusColors: Record<string, string> = {
  draft: 'var(--text-tertiary)',
  scheduled: 'var(--amber)',
  posted: 'var(--green)',
  skipped: 'var(--rose)',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function TwitterCommandCenter() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTweet, setEditingTweet] = useState<Tweet | null>(null);

  // Composer state
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('hype');
  const [newType, setNewType] = useState('organic');
  const [newSchedule, setNewSchedule] = useState('');
  const [newMediaNotes, setNewMediaNotes] = useState('');
  const [newHashtags, setNewHashtags] = useState('');

  const fetchTweets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      const res = await fetch(`/api/marketing/tweets?${params}`);
      const data = await res.json();
      setTweets(Array.isArray(data) ? data : []);
    } catch { setTweets([]); }
    setLoading(false);
  }, [filterStatus, filterCategory]);

  useEffect(() => { fetchTweets(); }, [fetchTweets]);

  const stats = {
    total: tweets.length,
    scheduled: tweets.filter(t => t.status === 'scheduled').length,
    posted: tweets.filter(t => t.status === 'posted').length,
    drafts: tweets.filter(t => t.status === 'draft').length,
  };

  // Calendar helpers
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);

  const getTweetsForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tweets.filter(t => t.scheduled_for && t.scheduled_for.startsWith(dateStr));
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const handleSaveTweet = async () => {
    const body: Record<string, unknown> = {
      content: newContent,
      category: newCategory,
      tweet_type: newType,
      media_notes: newMediaNotes || null,
      hashtags: newHashtags ? newHashtags.split(',').map(h => h.trim()) : null,
      scheduled_for: newSchedule || null,
      status: newSchedule ? 'scheduled' : 'draft',
      project: 'the-400-club',
    };

    if (editingTweet) {
      body.id = editingTweet.id;
      await fetch('/api/marketing/tweets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/marketing/tweets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    resetComposer();
    fetchTweets();
  };

  const handleDeleteTweet = async (id: string) => {
    await fetch(`/api/marketing/tweets?id=${id}`, { method: 'DELETE' });
    fetchTweets();
  };

  const resetComposer = () => {
    setComposerOpen(false);
    setEditingTweet(null);
    setNewContent('');
    setNewCategory('hype');
    setNewType('organic');
    setNewSchedule('');
    setNewMediaNotes('');
    setNewHashtags('');
  };

  const openEditor = (tweet: Tweet) => {
    setEditingTweet(tweet);
    setNewContent(tweet.content);
    setNewCategory(tweet.category || 'hype');
    setNewType(tweet.tweet_type);
    setNewSchedule(tweet.scheduled_for ? tweet.scheduled_for.slice(0, 16) : '');
    setNewMediaNotes(tweet.media_notes || '');
    setNewHashtags(tweet.hashtags ? tweet.hashtags.join(', ') : '');
    setComposerOpen(true);
  };

  const charCount = newContent.length;
  const charPct = Math.min(100, (charCount / 280) * 100);
  const charColor = charCount > 280 ? 'var(--rose)' : charCount > 250 ? 'var(--amber)' : 'var(--green)';

  const selectedDayTweets = selectedDate ? tweets.filter(t => t.scheduled_for && t.scheduled_for.startsWith(selectedDate)) : [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/marketing" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textDecoration: 'none' }}>← Marketing HQ</Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>🐦 Twitter / X Command Center</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.92rem' }}>Schedule, manage & track tweets for The 400 Club</p>
        </div>
        <button onClick={() => { resetComposer(); setComposerOpen(true); }} style={{
          padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
        }}>+ New Tweet</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Tweets', value: stats.total, color: 'var(--accent)' },
          { label: 'Scheduled', value: stats.scheduled, color: 'var(--amber)' },
          { label: 'Posted', value: stats.posted, color: 'var(--green)' },
          { label: 'Drafts', value: stats.drafts, color: 'var(--text-tertiary)' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', padding: '16px 14px',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* View Toggle & Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          {(['calendar', 'list'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
              background: viewMode === mode ? 'var(--accent)' : 'transparent',
              color: viewMode === mode ? '#fff' : 'var(--text-tertiary)',
            }}>{mode === 'calendar' ? '📅 Calendar' : '📋 List'}</button>
          ))}
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
          padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', fontSize: '0.82rem',
        }}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="posted">Posted</option>
          <option value="skipped">Skipped</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{
          padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', fontSize: '0.82rem',
        }}>
          <option value="all">All Categories</option>
          {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>Loading tweets...</div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '6px 14px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.85rem' }}>← Prev</button>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{MONTHS[calMonth]} {calYear}</h2>
            <button onClick={nextMonth} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '6px 14px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.85rem' }}>Next →</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', padding: '6px 0', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {calDays.map((day, i) => {
              if (day === null) return <div key={`e${i}`} style={{ minHeight: 90 }} />;
              const dayTweets = getTweetsForDay(day);
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              return (
                <div key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)} style={{
                  minHeight: 90, background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  border: isToday ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)', padding: '4px 6px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isToday ? 'var(--accent)' : 'var(--text-tertiary)', marginBottom: 2 }}>{day}</div>
                  {dayTweets.slice(0, 3).map(t => (
                    <div key={t.id} style={{
                      fontSize: '0.62rem', padding: '2px 4px', marginBottom: 1,
                      borderRadius: 3, background: `${categoryColors[t.category || ''] || 'var(--accent)'}22`,
                      borderLeft: `2px solid ${categoryColors[t.category || ''] || 'var(--accent)'}`,
                      color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{t.content.slice(0, 40)}</div>
                  ))}
                  {dayTweets.length > 3 && <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>+{dayTweets.length - 3} more</div>}
                </div>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedDate && (
            <div style={{ marginTop: 20, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
                Tweets for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              {selectedDayTweets.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No tweets scheduled</p>
              ) : selectedDayTweets.map(t => (
                <TweetCard key={t.id} tweet={t} onEdit={openEditor} onDelete={handleDeleteTweet} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div>
          {tweets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>No tweets found. Create your first tweet!</div>
          ) : tweets.map(t => (
            <TweetCard key={t.id} tweet={t} onEdit={openEditor} onDelete={handleDeleteTweet} />
          ))}
        </div>
      )}

      {/* Composer Modal */}
      {composerOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={e => { if (e.target === e.currentTarget) resetComposer(); }}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: 28,
            width: '100%', maxWidth: 540, border: '1px solid var(--border-subtle)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 20 }}>
              {editingTweet ? '✏️ Edit Tweet' : '✍️ Compose Tweet'}
            </h3>

            {/* Content */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Tweet Content</label>
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={4} style={{
                width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical',
                fontFamily: 'inherit',
              }} placeholder="What's happening with The 400 Club?" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <div style={{
                  width: 120, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{ width: `${charPct}%`, height: '100%', background: charColor, transition: 'all 0.2s' }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: charColor, fontWeight: 600 }}>{charCount}/280</span>
              </div>
            </div>

            {/* Category & Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{
                  width: '100%', padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem',
                }}>
                  {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)} style={{
                  width: '100%', padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem',
                }}>
                  <option value="organic">Organic</option>
                  <option value="thread">Thread</option>
                  <option value="reply">Reply</option>
                  <option value="quote">Quote</option>
                </select>
              </div>
            </div>

            {/* Schedule */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Schedule For</label>
              <input type="datetime-local" value={newSchedule} onChange={e => setNewSchedule(e.target.value)} style={{
                width: '100%', padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem',
              }} />
            </div>

            {/* Hashtags */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Hashtags (comma separated)</label>
              <input value={newHashtags} onChange={e => setNewHashtags(e.target.value)} style={{
                width: '100%', padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem',
              }} placeholder="#The400Club, #NFT, #GildedAgeDogs" />
            </div>

            {/* Media Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Media Notes</label>
              <input value={newMediaNotes} onChange={e => setNewMediaNotes(e.target.value)} style={{
                width: '100%', padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem',
              }} placeholder="Description of image/video to attach" />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={resetComposer} style={{
                padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.85rem',
              }}>Cancel</button>
              <button onClick={handleSaveTweet} disabled={!newContent || charCount > 280} style={{
                padding: '8px 20px', background: charCount > 280 ? 'var(--text-tertiary)' : 'var(--accent)',
                border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.85rem', opacity: !newContent || charCount > 280 ? 0.5 : 1,
              }}>{editingTweet ? 'Update' : 'Create'} Tweet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TweetCard({ tweet, onEdit, onDelete }: { tweet: Tweet; onEdit: (t: Tweet) => void; onDelete: (id: string) => void }) {
  const cat = tweet.category || '';
  const color = categoryColors[cat] || 'var(--accent)';
  const time = tweet.scheduled_for ? new Date(tweet.scheduled_for).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) : 'Unscheduled';

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 8,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            {cat && <span style={{
              fontSize: '0.65rem', padding: '2px 8px', borderRadius: 100,
              background: `${color}22`, color: color, fontWeight: 600,
            }}>{categoryLabels[cat] || cat}</span>}
            <span style={{
              fontSize: '0.65rem', padding: '2px 8px', borderRadius: 100,
              background: `${statusColors[tweet.status]}22`, color: statusColors[tweet.status],
              fontWeight: 600, textTransform: 'capitalize',
            }}>{tweet.status}</span>
            <span style={{
              fontSize: '0.65rem', padding: '2px 6px', borderRadius: 100,
              background: 'var(--bg-elevated)', color: 'var(--text-tertiary)',
            }}>{tweet.tweet_type}</span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6 }}>{tweet.content}</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>🕐 {time}</span>
            {tweet.hashtags && tweet.hashtags.length > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>{tweet.hashtags.join(' ')}</span>
            )}
            {tweet.media_notes && <span style={{ fontSize: '0.72rem', color: 'var(--purple)' }}>📎 {tweet.media_notes.slice(0, 40)}...</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onEdit(tweet)} style={{
            padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.75rem',
          }}>✏️</button>
          <button onClick={() => onDelete(tweet.id)} style={{
            padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', color: 'var(--rose)', cursor: 'pointer', fontSize: '0.75rem',
          }}>🗑️</button>
        </div>
      </div>
    </div>
  );
}
