'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DayData {
  journals: string[];
  tasks: string[];
  docs: string[];
  count: number;
}

interface CalendarData {
  month: string;
  year: number;
  mon: number;
  days: Record<string, DayData>;
}

type ViewMode = 'month' | 'week' | 'day' | 'agenda';
type FilterKey = 'journals' | 'tasks' | 'docs';

// ─── Constants ───────────────────────────────────────────────────────────────
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const COLORS = {
  bg0: '#09090b', bg1: '#18181b', bg2: '#27272a', bg3: '#3f3f46',
  border1: '#27272a', border2: '#3f3f46',
  purple: '#7c3aed', purpleLight: '#8b5cf6', purplePale: '#c4b5fd',
  text1: '#f4f4f5', text2: '#e4e4e7', text3: '#a1a1aa', text4: '#71717a', text5: '#52525b',
  journalColor: '#8b5cf6', taskColor: '#22d3ee', docColor: '#f59e0b',
  red: '#ef4444',
};

const HEATMAP = ['transparent', '#7c3aed22', '#7c3aed44', '#7c3aed77', '#7c3aedaa', '#7c3aeddd'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function extractName(path: string): string {
  const parts = path.split('/');
  const file = parts[parts.length - 1];
  return file.replace(/\.mdx?$/, '').replace(/[-_]/g, ' ');
}

// ─── Glassmorphism base ─────────────────────────────────────────────────────
const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: 'rgba(24,24,27,0.7)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${COLORS.border2}`,
  borderRadius: 12,
  ...extra,
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => fmt(today), [today]);

  // State
  const [viewDate, setViewDate] = useState(today);
  const [view, setView] = useState<ViewMode>('month');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({ journals: true, tasks: true, docs: true });
  const [cache, setCache] = useState<Record<string, CalendarData>>({});
  const [focusDate, setFocusDate] = useState(today);
  const containerRef = useRef<HTMLDivElement>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const monthKey = fmtMonth(viewDate);

  // ─── Data fetching with prefetch ───────────────────────────────────────────
  const fetchMonth = useCallback(async (key: string) => {
    if (cache[key]) return;
    try {
      const res = await fetch(`/api/calendar?month=${key}`);
      if (!res.ok) return;
      const data: CalendarData = await res.json();
      setCache(prev => ({ ...prev, [key]: data }));
    } catch { /* ignore */ }
  }, [cache]);

  useEffect(() => {
    const cur = fmtMonth(viewDate);
    const prev = fmtMonth(new Date(viewYear, viewMonth - 1, 1));
    const next = fmtMonth(new Date(viewYear, viewMonth + 1, 1));
    fetchMonth(cur);
    fetchMonth(prev);
    fetchMonth(next);
  }, [viewDate, fetchMonth, viewYear, viewMonth]);

  const data = cache[monthKey];
  const days = data?.days ?? {};

  // Also gather adjacent months data for week views that span months
  const allDays = useMemo(() => {
    const merged: Record<string, DayData> = {};
    Object.values(cache).forEach(cd => {
      if (cd?.days) Object.assign(merged, cd.days);
    });
    return merged;
  }, [cache]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let total = 0;
    let busiest = '';
    let busiestCount = 0;
    const dayKeys = Object.keys(days).sort();

    for (const [k, v] of Object.entries(days)) {
      total += v.count;
      if (v.count > busiestCount) { busiestCount = v.count; busiest = k; }
    }

    // Streak: consecutive days with activity ending at today or last active day
    let streak = 0;
    const check = new Date(today);
    for (let i = 0; i < 365; i++) {
      const k = fmt(check);
      const d = allDays[k];
      if (d && d.count > 0) { streak++; check.setDate(check.getDate() - 1); }
      else if (i === 0) { check.setDate(check.getDate() - 1); } // today might not have entries yet
      else break;
    }

    return { total, streak, busiest, busiestCount };
  }, [days, allDays, today]);

  // ─── Navigation ────────────────────────────────────────────────────────────
  const goMonth = useCallback((delta: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }, []);
  const goToday = useCallback(() => {
    setViewDate(today);
    setFocusDate(today);
    setSelectedDay(todayStr);
  }, [today, todayStr]);

  // ─── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); setFocusDate(prev => addDays(prev, -1)); break;
        case 'ArrowRight': e.preventDefault(); setFocusDate(prev => addDays(prev, 1)); break;
        case 'ArrowUp': e.preventDefault(); setFocusDate(prev => addDays(prev, -7)); break;
        case 'ArrowDown': e.preventDefault(); setFocusDate(prev => addDays(prev, 7)); break;
        case 'Enter': e.preventDefault(); setSelectedDay(fmt(focusDate)); break;
        case 'Escape': e.preventDefault(); setSelectedDay(null); break;
        case 't': case 'T': if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); goToday(); } break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusDate, goToday]);

  // sync viewDate when focusDate moves to different month
  useEffect(() => {
    if (focusDate.getMonth() !== viewDate.getMonth() || focusDate.getFullYear() !== viewDate.getFullYear()) {
      setViewDate(new Date(focusDate.getFullYear(), focusDate.getMonth(), 1));
    }
  }, [focusDate, viewDate]);

  // ─── Filter toggle ────────────────────────────────────────────────────────
  const toggleFilter = useCallback((key: FilterKey) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ─── Filtered items for a day ──────────────────────────────────────────────
  const getFilteredItems = useCallback((dayData: DayData | undefined) => {
    if (!dayData) return { journals: [], tasks: [], docs: [], count: 0 };
    const j = filters.journals ? dayData.journals : [];
    const t = filters.tasks ? dayData.tasks : [];
    const d = filters.docs ? dayData.docs : [];
    return { journals: j, tasks: t, docs: d, count: j.length + t.length + d.length };
  }, [filters]);

  // ─── Month grid cells ─────────────────────────────────────────────────────
  const monthCells = useMemo(() => {
    const dim = daysInMonth(viewYear, viewMonth);
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const cells: Array<{ date: Date; key: string; inMonth: boolean }> = [];
    // leading days from prev month
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth, -i);
      cells.push({ date: d, key: fmt(d), inMonth: false });
    }
    for (let i = 1; i <= dim; i++) {
      const d = new Date(viewYear, viewMonth, i);
      cells.push({ date: d, key: fmt(d), inMonth: true });
    }
    // trailing
    while (cells.length % 7 !== 0) {
      const d = new Date(viewYear, viewMonth + 1, cells.length - firstDow - dim + 1);
      cells.push({ date: d, key: fmt(d), inMonth: false });
    }
    return cells;
  }, [viewYear, viewMonth]);

  // ─── Week cells ────────────────────────────────────────────────────────────
  const weekCells = useMemo(() => {
    const s = startOfWeek(viewDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(s, i);
      return { date: d, key: fmt(d) };
    });
  }, [viewDate]);

  // ─── Upcoming 7 days ──────────────────────────────────────────────────────
  const upcoming = useMemo(() => {
    const result: Array<{ date: Date; key: string; data: DayData | undefined }> = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i);
      const k = fmt(d);
      result.push({ date: d, key: k, data: allDays[k] });
    }
    return result;
  }, [today, allDays]);

  // ─── Agenda items ─────────────────────────────────────────────────────────
  const agendaItems = useMemo(() => {
    return Object.entries(days)
      .filter(([, v]) => v.count > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ key: k, date: parseDate(k), data: v }));
  }, [days]);

  // ─── Detail panel data ────────────────────────────────────────────────────
  const detailData = selectedDay ? allDays[selectedDay] : undefined;

  // ─── Render helpers ────────────────────────────────────────────────────────
  const heatColor = (count: number): string => HEATMAP[Math.min(count, HEATMAP.length - 1)];

  const renderDot = (color: string, size = 6) => (
    <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color, marginRight: 3 }} />
  );

  const renderItemList = (items: string[], color: string, icon: string) => {
    if (!items.length) return null;
    return items.map((item, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${COLORS.border1}`, fontSize: 13, color: COLORS.text2 }}>
        <span style={{ color, fontSize: 14 }}>{icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{extractName(item)}</span>
      </div>
    ));
  };

  // ─── Current time position (0-100%) ────────────────────────────────────────
  const now = new Date();
  const timePercent = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;

  // ─── Mini calendar ─────────────────────────────────────────────────────────
  const renderMiniCalendar = () => {
    const dim = daysInMonth(viewYear, viewMonth);
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let i = 1; i <= dim; i++) cells.push(i);

    return (
      <div style={{ ...glass({ padding: 16, marginBottom: 16 }) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => goMonth(-1)} style={miniNavBtn}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text1 }}>{MONTHS[viewMonth]} {viewYear}</span>
          <button onClick={() => goMonth(1)} style={miniNavBtn}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, textAlign: 'center' }}>
          {DAYS_SHORT.map(d => <div key={d} style={{ fontSize: 10, color: COLORS.text5, padding: '2px 0' }}>{d[0]}</div>)}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const k = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = k === todayStr;
            const isSelected = k === selectedDay;
            const isFocused = sameDay(new Date(viewYear, viewMonth, day), focusDate);
            const dd = days[k];
            const count = dd?.count ?? 0;
            return (
              <div key={k} onClick={() => { setSelectedDay(k); setFocusDate(new Date(viewYear, viewMonth, day)); }}
                style={{
                  fontSize: 11, padding: '3px 0', borderRadius: 6, cursor: 'pointer',
                  background: isSelected ? COLORS.purple : isToday ? COLORS.purpleLight + '33' : heatColor(count),
                  color: isSelected ? '#fff' : isToday ? COLORS.purplePale : COLORS.text3,
                  fontWeight: isToday || isSelected ? 700 : 400,
                  outline: isFocused ? `1px solid ${COLORS.purpleLight}` : 'none',
                  transition: 'all 0.15s ease',
                }}>
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Upcoming timeline ─────────────────────────────────────────────────────
  const renderUpcoming = () => (
    <div style={{ ...glass({ padding: 16 }) }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text3, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Upcoming</div>
      {upcoming.map(({ date, key, data }) => {
        const items = getFilteredItems(data);
        const isToday = key === todayStr;
        return (
          <div key={key} onClick={() => setSelectedDay(key)}
            style={{ padding: '8px 0', borderBottom: `1px solid ${COLORS.border1}`, cursor: 'pointer', transition: 'background 0.15s', }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: isToday ? COLORS.purplePale : COLORS.text3, fontWeight: isToday ? 600 : 400 }}>
                {isToday ? 'Today' : DAYS_FULL[date.getDay()].slice(0, 3)} · {MONTHS[date.getMonth()].slice(0, 3)} {date.getDate()}
              </span>
              {items.count > 0 && <span style={{ fontSize: 11, color: COLORS.purple, fontWeight: 600 }}>{items.count}</span>}
            </div>
            {items.count > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {items.journals.length > 0 && renderDot(COLORS.journalColor)}
                {items.tasks.length > 0 && renderDot(COLORS.taskColor)}
                {items.docs.length > 0 && renderDot(COLORS.docColor)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── Stats bar ─────────────────────────────────────────────────────────────
  const renderStats = () => (
    <div style={{ display: 'flex', gap: 24, padding: '12px 20px', ...glass({ borderRadius: 10, marginBottom: 16 }) }}>
      <StatItem label="Items this month" value={stats.total} />
      <StatItem label="Day streak" value={`${stats.streak}🔥`} />
      <StatItem label="Busiest day" value={stats.busiest ? `${parseDate(stats.busiest).getDate()} ${MONTHS[parseDate(stats.busiest).getMonth()].slice(0, 3)} (${stats.busiestCount})` : '—'} />
    </div>
  );

  // ─── View toggle + filters ────────────────────────────────────────────────
  const renderToolbar = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={goToday} style={{ ...pillBtn, background: COLORS.purple, color: '#fff' }}>Today</button>
        <button onClick={() => goMonth(-1)} style={pillBtn}>←</button>
        <button onClick={() => goMonth(1)} style={pillBtn}>→</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text1, margin: '0 8px' }}>
          {MONTHS[viewMonth]} {viewYear}
        </h1>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Filters */}
        <FilterBadge label="Journals" color={COLORS.journalColor} active={filters.journals} onClick={() => toggleFilter('journals')} icon="📓" />
        <FilterBadge label="Tasks" color={COLORS.taskColor} active={filters.tasks} onClick={() => toggleFilter('tasks')} icon="✅" />
        <FilterBadge label="Docs" color={COLORS.docColor} active={filters.docs} onClick={() => toggleFilter('docs')} icon="📄" />
        <div style={{ width: 1, height: 24, background: COLORS.border2, margin: '0 8px' }} />
        {/* View toggles */}
        {(['month', 'week', 'day', 'agenda'] as ViewMode[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ ...pillBtn, background: view === v ? COLORS.purple : 'transparent', color: view === v ? '#fff' : COLORS.text4, fontWeight: view === v ? 600 : 400 }}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Month view ────────────────────────────────────────────────────────────
  const renderMonth = () => (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: COLORS.text5, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>{d}</div>
        ))}
        {monthCells.map(({ date, key, inMonth }) => {
          const dd = allDays[key];
          const items = getFilteredItems(dd);
          const isToday = key === todayStr;
          const isSelected = key === selectedDay;
          const isFocused = sameDay(date, focusDate);
          return (
            <div key={key}
              onClick={() => { setSelectedDay(key); setFocusDate(date); }}
              style={{
                minHeight: 90, padding: 8, cursor: 'pointer',
                background: isSelected ? COLORS.purple + '22' : heatColor(dd?.count ?? 0),
                border: `1px solid ${isSelected ? COLORS.purple : isFocused ? COLORS.purpleLight : COLORS.border1}`,
                borderRadius: 8, transition: 'all 0.2s ease',
                opacity: inMonth ? 1 : 0.35,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  fontSize: 13, fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#fff' : isSelected ? COLORS.purplePale : COLORS.text3,
                  background: isToday ? COLORS.purple : 'transparent',
                  borderRadius: '50%', width: isToday ? 26 : 'auto', height: isToday ? 26 : 'auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{date.getDate()}</span>
                {items.count > 0 && <span style={{ fontSize: 10, color: COLORS.text5 }}>{items.count}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.journals.slice(0, 1).map((j, i) => (
                  <div key={i} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, background: COLORS.journalColor + '22', color: COLORS.journalColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📓 {extractName(j)}
                  </div>
                ))}
                {items.tasks.slice(0, 1).map((t, i) => (
                  <div key={i} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, background: COLORS.taskColor + '22', color: COLORS.taskColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ✅ {extractName(t)}
                  </div>
                ))}
                {items.docs.slice(0, 1).map((d, i) => (
                  <div key={i} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, background: COLORS.docColor + '22', color: COLORS.docColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📄 {extractName(d)}
                  </div>
                ))}
                {items.count > 3 && <span style={{ fontSize: 9, color: COLORS.text5 }}>+{items.count - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Week view ─────────────────────────────────────────────────────────────
  const renderWeek = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return (
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 240px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7,1fr)', gap: 1 }}>
          {/* Header */}
          <div />
          {weekCells.map(({ date, key }) => {
            const isToday = key === todayStr;
            return (
              <div key={key} onClick={() => { setSelectedDay(key); setView('day'); setViewDate(date); }}
                style={{ textAlign: 'center', padding: '8px 0', cursor: 'pointer', borderBottom: `1px solid ${COLORS.border1}` }}>
                <div style={{ fontSize: 11, color: COLORS.text5, textTransform: 'uppercase' }}>{DAYS_SHORT[date.getDay()]}</div>
                <div style={{
                  fontSize: 20, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : COLORS.text2,
                  background: isToday ? COLORS.purple : 'transparent', borderRadius: '50%',
                  width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{date.getDate()}</div>
              </div>
            );
          })}
          {/* Time grid */}
          {hours.map(h => (
            <div key={h} style={{ display: 'contents' }}>
              <div style={{ fontSize: 10, color: COLORS.text5, padding: '4px 8px', textAlign: 'right', borderBottom: `1px solid ${COLORS.border1}`, position: 'relative', height: 48 }}>
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </div>
              {weekCells.map(({ key }) => {
                const dd = allDays[key];
                const isToday = key === todayStr;
                return (
                  <div key={`${h}-${key}`} style={{ borderBottom: `1px solid ${COLORS.border1}`, borderLeft: `1px solid ${COLORS.border1}`, height: 48, position: 'relative', background: heatColor(dd?.count ?? 0) }}>
                    {isToday && h === Math.floor(now.getHours()) && (
                      <div style={{ position: 'absolute', top: `${(now.getMinutes() / 60) * 100}%`, left: 0, right: 0, height: 2, background: COLORS.red, zIndex: 2 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.red, position: 'absolute', left: -4, top: -3 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Day view ──────────────────────────────────────────────────────────────
  const renderDay = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayData = allDays[fmt(viewDate)];
    const items = getFilteredItems(dayData);
    const isToday = fmt(viewDate) === todayStr;
    return (
      <div style={{ flex: 1, display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 240px)' }}>
          <div style={{ textAlign: 'center', padding: '12px 0', borderBottom: `1px solid ${COLORS.border1}`, marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: COLORS.text5, textTransform: 'uppercase' }}>{DAYS_FULL[viewDate.getDay()]}</div>
            <div style={{
              fontSize: 36, fontWeight: 700, color: isToday ? '#fff' : COLORS.text1,
              background: isToday ? COLORS.purple : 'transparent', borderRadius: '50%',
              width: 56, height: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto',
            }}>{viewDate.getDate()}</div>
          </div>
          {hours.map(h => (
            <div key={h} style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border1}`, position: 'relative' }}>
              <div style={{ width: 60, fontSize: 10, color: COLORS.text5, padding: '4px 8px', textAlign: 'right', height: 48 }}>
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </div>
              <div style={{ flex: 1, height: 48, position: 'relative' }}>
                {isToday && h === Math.floor(now.getHours()) && (
                  <div style={{ position: 'absolute', top: `${(now.getMinutes() / 60) * 100}%`, left: 0, right: 0, height: 2, background: COLORS.red, zIndex: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.red, position: 'absolute', left: -4, top: -3 }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Day items sidebar */}
        <div style={{ width: 280, ...glass({ padding: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 240px)' }) }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text1, marginBottom: 12 }}>
            {MONTHS[viewDate.getMonth()]} {viewDate.getDate()} — {items.count} items
          </div>
          {items.journals.length > 0 && <SectionLabel label="Journals" color={COLORS.journalColor} />}
          {renderItemList(items.journals, COLORS.journalColor, '📓')}
          {items.tasks.length > 0 && <SectionLabel label="Tasks" color={COLORS.taskColor} />}
          {renderItemList(items.tasks, COLORS.taskColor, '✅')}
          {items.docs.length > 0 && <SectionLabel label="Documents" color={COLORS.docColor} />}
          {renderItemList(items.docs, COLORS.docColor, '📄')}
          {items.count === 0 && <div style={{ color: COLORS.text5, fontSize: 13, fontStyle: 'italic', marginTop: 20, textAlign: 'center' }}>No items this day</div>}
        </div>
      </div>
    );
  };

  // ─── Agenda view ───────────────────────────────────────────────────────────
  const renderAgenda = () => (
    <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 240px)' }}>
      {agendaItems.length === 0 && <div style={{ color: COLORS.text5, fontSize: 14, textAlign: 'center', marginTop: 40 }}>No items this month</div>}
      {agendaItems.map(({ key, date, data }) => {
        const items = getFilteredItems(data);
        if (items.count === 0) return null;
        const isToday = key === todayStr;
        return (
          <div key={key} onClick={() => setSelectedDay(key)}
            style={{ display: 'flex', gap: 16, padding: '16px 12px', borderBottom: `1px solid ${COLORS.border1}`, cursor: 'pointer', transition: 'background 0.15s' }}>
            <div style={{ width: 50, textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: COLORS.text5, textTransform: 'uppercase' }}>{DAYS_SHORT[date.getDay()]}</div>
              <div style={{
                fontSize: 24, fontWeight: 700, color: isToday ? '#fff' : COLORS.text1,
                background: isToday ? COLORS.purple : 'transparent', borderRadius: '50%',
                width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{date.getDate()}</div>
            </div>
            <div style={{ flex: 1 }}>
              {items.journals.map((j, i) => (
                <div key={`j${i}`} style={{ fontSize: 13, color: COLORS.journalColor, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>📓 {extractName(j)}</div>
              ))}
              {items.tasks.map((t, i) => (
                <div key={`t${i}`} style={{ fontSize: 13, color: COLORS.taskColor, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>✅ {extractName(t)}</div>
              ))}
              {items.docs.map((d, i) => (
                <div key={`d${i}`} style={{ fontSize: 13, color: COLORS.docColor, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>📄 {extractName(d)}</div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: COLORS.text5, flexShrink: 0 }}>{items.count} items</div>
          </div>
        );
      })}
    </div>
  );

  // ─── Detail panel ──────────────────────────────────────────────────────────
  const renderDetailPanel = () => {
    if (!selectedDay) return null;
    const d = parseDate(selectedDay);
    const items = getFilteredItems(detailData);
    return (
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360, zIndex: 100,
        ...glass({ borderRadius: 0, borderLeft: `1px solid ${COLORS.border2}`, padding: 24, overflowY: 'auto' }),
        animation: 'slideIn 0.25s ease-out',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.text5, textTransform: 'uppercase', letterSpacing: 1 }}>{DAYS_FULL[d.getDay()]}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.text1 }}>{MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}</div>
          </div>
          <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', color: COLORS.text4, fontSize: 20, cursor: 'pointer', padding: 8 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {renderDot(COLORS.journalColor, 8)}<span style={{ fontSize: 12, color: COLORS.text4 }}>{items.journals.length} journals</span>
          {renderDot(COLORS.taskColor, 8)}<span style={{ fontSize: 12, color: COLORS.text4 }}>{items.tasks.length} tasks</span>
          {renderDot(COLORS.docColor, 8)}<span style={{ fontSize: 12, color: COLORS.text4 }}>{items.docs.length} docs</span>
        </div>

        {items.journals.length > 0 && <><SectionLabel label="Journals" color={COLORS.journalColor} />{renderItemList(items.journals, COLORS.journalColor, '📓')}</>}
        {items.tasks.length > 0 && <><SectionLabel label="Tasks" color={COLORS.taskColor} />{renderItemList(items.tasks, COLORS.taskColor, '✅')}</>}
        {items.docs.length > 0 && <><SectionLabel label="Documents" color={COLORS.docColor} />{renderItemList(items.docs, COLORS.docColor, '📄')}</>}

        {items.count === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40, color: COLORS.text5 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14 }}>Nothing here yet</div>
          </div>
        )}
      </div>
    );
  };

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ minHeight: '100vh', background: COLORS.bg0, color: COLORS.text1, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border2}; border-radius: 3px; }
      `}</style>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px' }}>
        {renderStats()}
        {renderToolbar()}
        <div style={{ display: 'flex', gap: 20 }}>
          {/* Left sidebar */}
          {view === 'month' && (
            <div style={{ width: 220, flexShrink: 0 }}>
              {renderMiniCalendar()}
              {renderUpcoming()}
            </div>
          )}
          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0, ...glass({ padding: 16 }) }}>
            {view === 'month' && renderMonth()}
            {view === 'week' && renderWeek()}
            {view === 'day' && renderDay()}
            {view === 'agenda' && renderAgenda()}
          </div>
        </div>
      </div>
      {renderDetailPanel()}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function FilterBadge({ label, color, active, onClick, icon }: { label: string; color: string; active: boolean; onClick: () => void; icon: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
      border: `1px solid ${active ? color : '#3f3f46'}`, background: active ? color + '22' : 'transparent',
      color: active ? color : '#71717a', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
      fontFamily: 'inherit',
    }}>
      {icon} {label}
    </button>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 6 }}>{label}</div>
  );
}

// ─── Shared styles ───────────────────────────────────────────────────────────
const pillBtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 20, border: `1px solid #3f3f46`,
  background: 'transparent', color: '#a1a1aa', fontSize: 13, cursor: 'pointer',
  fontFamily: 'inherit', transition: 'all 0.15s',
};

const miniNavBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#a1a1aa', fontSize: 18, cursor: 'pointer', padding: '2px 8px',
  fontFamily: 'inherit',
};
