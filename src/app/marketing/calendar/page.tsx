'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';

interface Task {
  id: string; content_id: string; task_name: string; skill_required: string;
  tool: string; assigned_to: string; status: string; sort_order: number;
  due_at: string | null; completed_at: string | null;
}

interface Job {
  id: string; title: string; platform: string; content_type: string; status: string;
  scheduled_for: string | null; business_unit_id: string | null;
  script: string; caption: string;
  ops_business_units: { name: string } | null;
  marketing_campaigns: { name: string } | null;
  tasks?: Task[];
}

interface BU { id: string; name: string; }
interface Channel { id: string; name: string; platform: string; handle: string; business_unit_id: string | null; }

const platformIcons: Record<string, string> = { tiktok: '🎵', twitter: '🐦', instagram: '📸', youtube: '🎬', facebook: '📘', linkedin: '💼' };
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toolLabels: Record<string, string> = { higgsfield: 'Higgsfield.ai', davinci_resolve: 'DaVinci Resolve', canva: 'Canva', capcut: 'CapCut', manual: 'Manual' };
const skillLabels: Record<string, string> = { copywriting: '✍️', video_gen: '🤖', editing: '🎬', design: '🎨', posting: '📤' };

const TASK_TEMPLATES: Record<string, Array<{ task_name: string; skill_required: string; tool: string; sort_order: number }>> = {
  tiktok: [
    { task_name: 'Write script', skill_required: 'copywriting', tool: 'manual', sort_order: 0 },
    { task_name: 'Generate video in Higgsfield', skill_required: 'video_gen', tool: 'higgsfield', sort_order: 1 },
    { task_name: 'Edit video', skill_required: 'editing', tool: 'davinci_resolve', sort_order: 2 },
    { task_name: 'Add captions', skill_required: 'editing', tool: 'capcut', sort_order: 3 },
    { task_name: 'Create thumbnail', skill_required: 'design', tool: 'canva', sort_order: 4 },
    { task_name: 'Schedule post', skill_required: 'posting', tool: 'manual', sort_order: 5 },
    { task_name: 'Publish', skill_required: 'posting', tool: 'manual', sort_order: 6 },
  ],
  tweet: [
    { task_name: 'Write copy', skill_required: 'copywriting', tool: 'manual', sort_order: 0 },
    { task_name: 'Create graphic', skill_required: 'design', tool: 'canva', sort_order: 1 },
    { task_name: 'Schedule post', skill_required: 'posting', tool: 'manual', sort_order: 2 },
    { task_name: 'Publish', skill_required: 'posting', tool: 'manual', sort_order: 3 },
  ],
  instagram: [
    { task_name: 'Write caption', skill_required: 'copywriting', tool: 'manual', sort_order: 0 },
    { task_name: 'Create visual', skill_required: 'design', tool: 'canva', sort_order: 1 },
    { task_name: 'Add hashtags', skill_required: 'copywriting', tool: 'manual', sort_order: 2 },
    { task_name: 'Schedule', skill_required: 'posting', tool: 'manual', sort_order: 3 },
    { task_name: 'Publish', skill_required: 'posting', tool: 'manual', sort_order: 4 },
  ],
  youtube: [
    { task_name: 'Write script', skill_required: 'copywriting', tool: 'manual', sort_order: 0 },
    { task_name: 'Record/Generate video', skill_required: 'video_gen', tool: 'higgsfield', sort_order: 1 },
    { task_name: 'Edit video', skill_required: 'editing', tool: 'davinci_resolve', sort_order: 2 },
    { task_name: 'Create thumbnail', skill_required: 'design', tool: 'canva', sort_order: 3 },
    { task_name: 'SEO & Tags', skill_required: 'copywriting', tool: 'manual', sort_order: 4 },
    { task_name: 'Upload', skill_required: 'posting', tool: 'manual', sort_order: 5 },
    { task_name: 'Publish', skill_required: 'posting', tool: 'manual', sort_order: 6 },
  ],
};

function getJobCompletionColor(tasks: Task[] | undefined) {
  if (!tasks || tasks.length === 0) return 'var(--text-tertiary)';
  const done = tasks.filter(t => t.status === 'done').length;
  const ratio = done / tasks.length;
  if (ratio >= 1) return 'var(--green)';
  if (ratio > 0) return 'var(--amber)';
  return 'var(--rose)';
}

function getMonday(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [bus, setBus] = useState<BU[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [baseDate, setBaseDate] = useState(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState('');
  const [filling, setFilling] = useState(false);
  const [fillResult, setFillResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', platform: 'tiktok', content_type: 'tiktok', business_unit_id: '', scheduled_for: '',
  });

  const load = useCallback(async () => {
    const [jobsRes, tasksRes] = await Promise.all([
      fetch('/api/marketing/content').then(r => r.json()),
      fetch('/api/marketing/tasks').then(r => r.json()),
    ]);
    setJobs(Array.isArray(jobsRes) ? jobsRes : []);
    setAllTasks(Array.isArray(tasksRes) ? tasksRes : []);
  }, []);

  useEffect(() => {
    load();
    fetch('/api/ops/business-units').then(r => r.json()).then(d => setBus(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/marketing/channels').then(r => r.json()).then(d => setChannels(Array.isArray(d) ? d : [])).catch(() => {});
  }, [load]);

  // Attach tasks to jobs
  const jobsWithTasks = useMemo(() => {
    const taskMap: Record<string, Task[]> = {};
    for (const t of allTasks) {
      if (!taskMap[t.content_id]) taskMap[t.content_id] = [];
      taskMap[t.content_id].push(t);
    }
    return jobs.map(j => ({ ...j, tasks: taskMap[j.id] || [] }));
  }, [jobs, allTasks]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const days = useMemo(() => {
    const result: Date[] = [];
    if (view === 'week') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate); d.setDate(baseDate.getDate() + i); result.push(d);
      }
    } else {
      const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const startDay = start.getDay();
      for (let i = -startDay; i < 42 - startDay; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i); result.push(d);
      }
    }
    return result;
  }, [baseDate, view]);

  const jobsByDay = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const job of jobsWithTasks) {
      if (!job.scheduled_for) continue;
      const dateStr = new Date(job.scheduled_for).toISOString().split('T')[0];
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(job);
    }
    return map;
  }, [jobsWithTasks]);

  // Workload: skills needed per day
  const workloadByDay = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const job of jobsWithTasks) {
      if (!job.scheduled_for) continue;
      const dateStr = new Date(job.scheduled_for).toISOString().split('T')[0];
      if (!map[dateStr]) map[dateStr] = {};
      for (const t of (job.tasks || [])) {
        if (t.status !== 'done' && t.tool) {
          map[dateStr][t.tool] = (map[dateStr][t.tool] || 0) + 1;
        }
      }
    }
    return map;
  }, [jobsWithTasks]);

  const nav = (dir: number) => {
    const d = new Date(baseDate);
    if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setBaseDate(view === 'week' ? getMonday(d) : d);
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await fetch('/api/marketing/tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: newStatus }),
    });
    load();
  };

  const createJob = async () => {
    const body = {
      title: form.title,
      platform: form.platform,
      content_type: form.content_type,
      status: 'idea',
      business_unit_id: form.business_unit_id || null,
      scheduled_for: form.scheduled_for || null,
    };
    const res = await fetch('/api/marketing/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const content = await res.json();
    if (content.id) {
      const templateKey = form.content_type === 'tweet' ? 'tweet' : form.platform;
      const template = TASK_TEMPLATES[templateKey] || TASK_TEMPLATES.tiktok;
      const tasks = template.map(t => ({ content_id: content.id, ...t, assigned_to: 'unassigned', status: 'todo' }));
      await fetch('/api/marketing/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tasks),
      });
    }
    setShowCreate(false);
    setForm({ title: '', platform: 'tiktok', content_type: 'tiktok', business_unit_id: '', scheduled_for: '' });
    load();
  };

  const fillCalendar = async () => {
    setFilling(true);
    setFillResult(null);
    const weekStart = baseDate.toISOString().split('T')[0];
    const res = await fetch('/api/marketing/fill-calendar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart }),
    });
    const data = await res.json();
    setFilling(false);
    setFillResult(`Created ${data.created} jobs (${data.totalThisWeek} total this week)`);
    load();
    setTimeout(() => setFillResult(null), 5000);
  };

  const openCreateForDay = (dateStr: string) => {
    setCreateDate(dateStr);
    setForm({ ...form, scheduled_for: dateStr + 'T10:00:00' });
    setShowCreate(true);
  };

  const selectedJobs = selectedDay ? (jobsByDay[selectedDay] || []) : [];
  const selectedWorkload = selectedDay ? (workloadByDay[selectedDay] || {}) : {};

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>📅 Production Calendar</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Plan, track & manage content production jobs</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => nav(-1)} className="btn-secondary" style={{ padding: '6px 12px' }}>←</button>
          <button onClick={() => { setBaseDate(getMonday(new Date())); }} className="btn-secondary" style={{ padding: '6px 12px' }}>Today</button>
          <button onClick={() => nav(1)} className="btn-secondary" style={{ padding: '6px 12px' }}>→</button>
          <button onClick={() => setView(view === 'week' ? 'month' : 'week')} className="btn-secondary" style={{ padding: '6px 12px' }}>
            {view === 'week' ? '📅 Month' : '📅 Week'}
          </button>
          <button onClick={fillCalendar} disabled={filling} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--green)',
            background: 'var(--green-subtle)', color: 'var(--green)', fontSize: '0.84rem',
            fontWeight: 600, cursor: filling ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}>
            {filling ? '⏳ Filling...' : '⚡ Fill Calendar'}
          </button>
          <button onClick={() => { setCreateDate(''); setShowCreate(true); }} className="btn-primary">+ New Job</button>
        </div>
      </div>

      {fillResult && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16,
          background: 'var(--green-subtle)', border: '1px solid var(--green)', color: 'var(--green)',
          fontSize: '0.85rem', fontWeight: 500,
        }}>✅ {fillResult}</div>
      )}

      {/* Week label */}
      <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
        {view === 'week'
          ? `${baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(baseDate.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {dayNames.map(d => (
          <div key={d} style={{ padding: '6px 4px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {days.map((day, i) => {
          const dateStr = day.toISOString().split('T')[0];
          const isToday = dateStr === todayStr;
          const isSelected = selectedDay === dateStr;
          const isCurrentMonth = day.getMonth() === baseDate.getMonth();
          const dayJobs = jobsByDay[dateStr] || [];
          const dayWorkload = workloadByDay[dateStr] || {};

          return (
            <div key={i} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
              style={{
                background: isToday ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: 6,
                minHeight: view === 'week' ? 140 : 90,
                cursor: 'pointer', opacity: isCurrentMonth || view === 'week' ? 1 : 0.35,
                transition: 'all 0.15s',
              }}>
              {/* Day number + job count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  fontSize: '0.78rem', fontWeight: isToday ? 700 : 500,
                  color: isToday ? 'var(--accent)' : 'var(--text-secondary)',
                }}>{day.getDate()}</span>
                {dayJobs.length > 0 && (
                  <span style={{
                    fontSize: '0.62rem', padding: '1px 5px', borderRadius: 100,
                    background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', fontWeight: 600,
                  }}>{dayJobs.length}</span>
                )}
              </div>

              {/* Job cards */}
              {dayJobs.slice(0, view === 'week' ? 4 : 2).map(job => {
                const tasks = job.tasks || [];
                const done = tasks.filter(t => t.status === 'done').length;
                const total = tasks.length;
                const color = getJobCompletionColor(tasks);
                return (
                  <div key={job.id} style={{
                    fontSize: '0.65rem', padding: '3px 5px', borderRadius: 4, marginBottom: 2,
                    background: 'var(--bg-elevated)', borderLeft: `3px solid ${color}`,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span>{platformIcons[job.platform]}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</span>
                    </div>
                    {total > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <div style={{
                          flex: 1, height: 3, borderRadius: 2, background: 'var(--border-subtle)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${(done / total) * 100}%`, height: '100%',
                            background: color, borderRadius: 2, transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>{done}/{total}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {dayJobs.length > (view === 'week' ? 4 : 2) && (
                <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  +{dayJobs.length - (view === 'week' ? 4 : 2)} more
                </div>
              )}

              {/* Workload pills */}
              {view === 'week' && Object.keys(dayWorkload).length > 0 && (
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 3 }}>
                  {Object.entries(dayWorkload).slice(0, 3).map(([tool, count]) => (
                    <span key={tool} style={{
                      fontSize: '0.55rem', padding: '0 3px', borderRadius: 3,
                      background: 'var(--purple-subtle)', color: 'var(--purple)',
                    }}>{toolLabels[tool]?.split(' ')[0] || tool} ×{count}</span>
                  ))}
                </div>
              )}

              {/* Quick add on empty day */}
              {dayJobs.length === 0 && view === 'week' && (
                <div onClick={e => { e.stopPropagation(); openCreateForDay(dateStr); }}
                  style={{
                    fontSize: '0.65rem', color: 'var(--text-tertiary)', textAlign: 'center',
                    padding: '8px 0', cursor: 'pointer', opacity: 0.5,
                  }}>+ add</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDay && (
        <div style={{
          marginTop: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <button onClick={() => openCreateForDay(selectedDay)} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.82rem' }}>+ Add Job</button>
          </div>

          {/* Workload summary */}
          {Object.keys(selectedWorkload).length > 0 && (
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px',
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>Tools needed:</span>
              {Object.entries(selectedWorkload).map(([tool, count]) => (
                <span key={tool} style={{
                  fontSize: '0.75rem', padding: '2px 8px', borderRadius: 100,
                  background: 'var(--purple-subtle)', color: 'var(--purple)', fontWeight: 500,
                }}>{toolLabels[tool] || tool} ×{count as number}</span>
              ))}
            </div>
          )}

          {/* Jobs list */}
          {selectedJobs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>
              No jobs scheduled. Click &quot;+ Add Job&quot; to create one.
            </div>
          )}

          {selectedJobs.map(job => {
            const tasks = job.tasks || [];
            const done = tasks.filter(t => t.status === 'done').length;
            const total = tasks.length;
            const isExpanded = expandedJob === job.id;
            const color = getJobCompletionColor(tasks);

            return (
              <div key={job.id} style={{
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                marginBottom: 8, overflow: 'hidden',
              }}>
                {/* Job header */}
                <div onClick={() => setExpandedJob(isExpanded ? null : job.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  cursor: 'pointer', background: isExpanded ? 'var(--bg-elevated)' : 'transparent',
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{platformIcons[job.platform]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {job.ops_business_units?.name || 'Unassigned'}
                      {job.scheduled_for && ` · ${new Date(job.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                      <div style={{
                        width: total > 0 ? `${(done / total) * 100}%` : '0%', height: '100%',
                        background: color, borderRadius: 3, transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color, minWidth: 32 }}>{done}/{total}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{isExpanded ? '▼' : '▶'}</span>
                </div>

                {/* Task breakdown */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 14px' }}>
                    {tasks.sort((a, b) => a.sort_order - b.sort_order).map(task => (
                      <div key={task.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                        borderBottom: '1px solid var(--border-subtle)',
                        opacity: task.status === 'done' ? 0.5 : 1,
                      }}>
                        {/* Checkbox */}
                        <button onClick={() => toggleTask(task)} style={{
                          width: 20, height: 20, borderRadius: 4, border: task.status === 'done' ? '2px solid var(--green)' : '2px solid var(--border-default)',
                          background: task.status === 'done' ? 'var(--green)' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '0.7rem', flexShrink: 0,
                        }}>{task.status === 'done' ? '✓' : ''}</button>

                        {/* Skill icon */}
                        <span style={{ fontSize: '0.85rem' }}>{skillLabels[task.skill_required] || '📋'}</span>

                        {/* Task name */}
                        <span style={{
                          flex: 1, fontSize: '0.84rem', fontWeight: 500,
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        }}>{task.task_name}</span>

                        {/* Tool badge */}
                        <span style={{
                          fontSize: '0.68rem', padding: '2px 8px', borderRadius: 100,
                          background: 'var(--bg-elevated)', color: 'var(--text-tertiary)',
                          border: '1px solid var(--border-subtle)',
                        }}>{toolLabels[task.tool] || task.tool}</span>

                        {/* Assigned */}
                        <span style={{
                          fontSize: '0.72rem', padding: '2px 8px', borderRadius: 100,
                          background: task.assigned_to === 'Anthony' ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                          color: task.assigned_to === 'Anthony' ? 'var(--accent)' : 'var(--text-tertiary)',
                          border: '1px solid var(--border-subtle)',
                        }}>{task.assigned_to}</span>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div style={{ padding: '8px 0', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>No tasks yet</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Job Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)', padding: 28, width: 500, maxWidth: '90vw',
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>New Production Job</h2>

            <label className="modal-label">Title</label>
            <input className="modal-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Honey Bunny - Monday Video 1" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="modal-label">Platform</label>
                <select className="modal-select" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value, content_type: e.target.value })}>
                  {Object.entries(platformIcons).map(([p, icon]) => <option key={p} value={p}>{icon} {p}</option>)}
                </select>
              </div>
              <div>
                <label className="modal-label">Content Type</label>
                <select className="modal-select" value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}>
                  {['tiktok', 'tweet', 'instagram', 'youtube'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <label className="modal-label">Business Unit</label>
            <select className="modal-select" value={form.business_unit_id} onChange={e => setForm({ ...form, business_unit_id: e.target.value })}>
              <option value="">Select...</option>
              {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <label className="modal-label">Scheduled Date/Time</label>
            <input className="modal-input" type="datetime-local" value={form.scheduled_for}
              onChange={e => setForm({ ...form, scheduled_for: e.target.value })} />

            {/* Template preview */}
            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Tasks (auto-created from template)
              </div>
              {(TASK_TEMPLATES[form.content_type] || TASK_TEMPLATES.tiktok).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '3px 0', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{i + 1}.</span>
                  <span>{skillLabels[t.skill_required]}</span>
                  <span style={{ flex: 1 }}>{t.task_name}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>{toolLabels[t.tool]}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary" onClick={createJob} disabled={!form.title}>Create Job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
