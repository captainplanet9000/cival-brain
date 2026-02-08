'use client';
import { useEffect, useState } from 'react';

interface DayData { journals: string[]; tasks: string[]; docs: string[]; count: number; }
interface CalData { month: string; year: number; mon: number; days: Record<string, DayData>; }

export default function Calendar() {
  const [data, setData] = useState<CalData | null>(null);
  const [month, setMonth] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { fetch(`/api/calendar?month=${month}`).then(r => r.json()).then(setData); }, [month]);

  const navMonth = (dir: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelected(null);
  };

  if (!data) return <div style={{ padding: '2rem', color: '#71717a' }}>Loading...</div>;

  const firstDay = new Date(data.year, data.mon - 1, 1).getDay();
  const daysInMonth = new Date(data.year, data.mon, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const monthLabel = new Date(data.year, data.mon - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const maxCount = Math.max(1, ...Object.values(data.days).map(d => d.count));
  const selectedData = selected ? data.days[selected] : null;

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f4f4f5' }}>📅 Calendar</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navMonth(-1)} style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, color: '#a1a1aa', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>←</button>
          <span style={{ color: '#e4e4e7', fontWeight: 600, fontSize: '1.1rem', minWidth: 180, textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => navMonth(1)} style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, color: '#a1a1aa', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>→</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: '1.5rem' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', color: '#52525b', fontSize: '0.75rem', fontWeight: 600, padding: '0.5rem 0', textTransform: 'uppercase' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const dateStr = `${month}-${String(day).padStart(2, '0')}`;
          const dayData = data.days[dateStr];
          const count = dayData?.count || 0;
          const intensity = count / maxCount;
          const isToday = dateStr === today;
          const isSel = dateStr === selected;
          return (
            <div key={dateStr} onClick={() => setSelected(dateStr === selected ? null : dateStr)}
              style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: 10, cursor: 'pointer', position: 'relative',
                background: isSel ? '#7c3aed33' : count > 0 ? `rgba(124,58,237,${0.1 + intensity * 0.35})` : '#18181b',
                border: isToday ? '2px solid #7c3aed' : isSel ? '2px solid #7c3aed' : '1px solid #27272a',
              }}>
              <span style={{ color: isToday ? '#c4b5fd' : '#e4e4e7', fontWeight: isToday ? 700 : 400, fontSize: '0.9rem' }}>{day}</span>
              {count > 0 && (
                <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                  {dayData.journals.length > 0 && <span style={{ fontSize: '0.5rem' }}>📓</span>}
                  {dayData.tasks.length > 0 && <span style={{ fontSize: '0.5rem' }}>✅</span>}
                  {dayData.docs.length > 0 && <span style={{ fontSize: '0.5rem' }}>📝</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedData && (
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ color: '#e4e4e7', fontWeight: 600, marginBottom: '0.75rem' }}>{new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          {selectedData.journals.length > 0 && <div style={{ marginBottom: '0.5rem' }}><span style={{ color: '#71717a', fontSize: '0.8rem', fontWeight: 600 }}>📓 Journals:</span>{selectedData.journals.map(j => <span key={j} style={{ display: 'block', color: '#a1a1aa', fontSize: '0.85rem', paddingLeft: '1rem' }}>{j}</span>)}</div>}
          {selectedData.tasks.length > 0 && <div style={{ marginBottom: '0.5rem' }}><span style={{ color: '#71717a', fontSize: '0.8rem', fontWeight: 600 }}>✅ Tasks:</span>{selectedData.tasks.map(t => <span key={t} style={{ display: 'block', color: '#a1a1aa', fontSize: '0.85rem', paddingLeft: '1rem' }}>{t}</span>)}</div>}
          {selectedData.docs.length > 0 && <div><span style={{ color: '#71717a', fontSize: '0.8rem', fontWeight: 600 }}>📝 Documents:</span>{selectedData.docs.map(d => <span key={d} style={{ display: 'block', color: '#a1a1aa', fontSize: '0.85rem', paddingLeft: '1rem' }}>{d}</span>)}</div>}
        </div>
      )}
      {selected && !selectedData && <p style={{ color: '#52525b', textAlign: 'center' }}>No activity on this day.</p>}
    </div>
  );
}
