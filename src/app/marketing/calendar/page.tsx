'use client';
import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import s from './calendar.module.css';

/* ─── Types ─── */
interface Task {
  id: string; content_id: string; task_name: string; skill_required: string;
  tool: string; assigned_to: string; status: string; sort_order: number;
  due_at: string | null; completed_at: string | null;
}
interface Job {
  id: string; title: string; platform: string; content_type: string; status: string;
  scheduled_for: string | null; business_unit_id: string | null; script_id: string | null;
  script: string; caption: string; published_url: string | null;
  recurring_config: any; recurring_parent_id: string | null;
  ops_business_units: { name: string } | null;
  marketing_campaigns: { name: string } | null;
  tasks?: Task[];
}
interface BU { id: string; name: string; }
interface Script { id: string; title: string; series_name: string; category: string; status: string; }

/* ─── Constants ─── */
const PI: Record<string, string> = { tiktok: '🎵', twitter: '🐦', instagram: '📸', youtube: '🎬', facebook: '📘', linkedin: '💼' };
const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TL: Record<string, string> = { higgsfield: 'Higgsfield', davinci_resolve: 'DaVinci', canva: 'Canva', capcut: 'CapCut', manual: 'Manual' };
const SL: Record<string, string> = { copywriting: '✍️', video_gen: '🤖', editing: '🎬', design: '🎨', posting: '📤' };
const SC: Record<string, string> = { idea: 'var(--purple)', scripted: 'var(--accent)', producing: 'var(--amber)', review: 'var(--teal)', scheduled: 'var(--green)', published: 'var(--text-tertiary)' };
const ASSIGNEES = ['Anthony', 'clawd', 'unassigned'];

const TEMPLATES: Record<string, Array<{ task_name: string; skill_required: string; tool: string; sort_order: number }>> = {
  tiktok: [
    { task_name: 'Write script', skill_required: 'copywriting', tool: 'manual', sort_order: 0 },
    { task_name: 'Generate video', skill_required: 'video_gen', tool: 'higgsfield', sort_order: 1 },
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
    { task_name: 'Record/Generate', skill_required: 'video_gen', tool: 'higgsfield', sort_order: 1 },
    { task_name: 'Edit video', skill_required: 'editing', tool: 'davinci_resolve', sort_order: 2 },
    { task_name: 'Thumbnail', skill_required: 'design', tool: 'canva', sort_order: 3 },
    { task_name: 'SEO & Tags', skill_required: 'copywriting', tool: 'manual', sort_order: 4 },
    { task_name: 'Upload', skill_required: 'posting', tool: 'manual', sort_order: 5 },
    { task_name: 'Publish', skill_required: 'posting', tool: 'manual', sort_order: 6 },
  ],
};

/* ─── Helpers ─── */
function compColor(tasks?: Task[]) {
  if (!tasks || !tasks.length) return 'var(--text-tertiary)';
  const r = tasks.filter(t => t.status === 'done').length / tasks.length;
  return r >= 1 ? 'var(--green)' : r > 0 ? 'var(--amber)' : 'var(--rose)';
}
function getMonday(d: Date) {
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(d); m.setDate(diff); m.setHours(0,0,0,0); return m;
}
function ds(d: Date) { return d.toISOString().split('T')[0]; }
function isOverdue(j: Job) {
  if (!j.scheduled_for || j.status === 'published') return false;
  const t = j.tasks || [];
  if (t.length > 0 && t.every(x => x.status === 'done')) return false;
  return new Date(j.scheduled_for) < new Date();
}
function isAtRisk(j: Job) {
  if (!j.scheduled_for || j.status === 'published') return false;
  const t = j.tasks || [], done = t.filter(x => x.status === 'done').length, total = t.length;
  if (!total || done === total) return false;
  const h = (new Date(j.scheduled_for).getTime() - Date.now()) / 3600000;
  return h < 24 && h > 0 && done / total < 0.6;
}
function cx(...args: (string | false | null | undefined)[]) { return args.filter(Boolean).join(' '); }

/* ─── Suspense Wrapper ─── */
export default function Wrap() {
  return <Suspense fallback={<div className={s.page} style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>Loading calendar…</div>}><Cal /></Suspense>;
}

function Cal() {
  const sp = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [bus, setBus] = useState<BU[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [view, setView] = useState<'week'|'month'|'timeline'>('week');
  const [baseDate, setBaseDate] = useState(() => getMonday(new Date()));
  const [selDay, setSelDay] = useState<string|null>(null);
  const [expJob, setExpJob] = useState<string|null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filling, setFilling] = useState(false);
  const [fillMsg, setFillMsg] = useState<string|null>(null);
  const [editTitle, setEditTitle] = useState<string|null>(null);
  const [editTitleVal, setEditTitleVal] = useState('');
  const [editTime, setEditTime] = useState<string|null>(null);
  const [editTimeVal, setEditTimeVal] = useState('');
  const [pubPrompt, setPubPrompt] = useState<string|null>(null);
  const [pubUrl, setPubUrl] = useState('');
  const [showInsights, setShowInsights] = useState(true);
  const [dragId, setDragId] = useState<string|null>(null);
  const [dragOver, setDragOver] = useState<string|null>(null);
  const [mobile, setMobile] = useState(false);
  const [mobDay, setMobDay] = useState(() => ds(new Date()));
  const [mobSheet, setMobSheet] = useState<string|null>(null);
  const [fPlat, setFPlat] = useState(sp.get('platform')||'');
  const [fBU, setFBU] = useState(sp.get('bu')||'');
  const [fStatus, setFStatus] = useState(sp.get('status')||'');
  const [fAssign, setFAssign] = useState(sp.get('assignee')||'');
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({ title:'', platform:'tiktok', content_type:'tiktok', business_unit_id:'', scheduled_for:'', recurring:'', script_id:'' });
  const touchX = useRef(0);

  useEffect(() => { const c = () => setMobile(window.innerWidth < 768); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (fPlat) p.set('platform', fPlat); if (fBU) p.set('bu', fBU); if (fStatus) p.set('status', fStatus); if (fAssign) p.set('assignee', fAssign);
    const q = p.toString(); window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
  }, [fPlat, fBU, fStatus, fAssign]);

  const load = useCallback(async () => {
    const [j, t] = await Promise.all([fetch('/api/marketing/content').then(r=>r.json()), fetch('/api/marketing/tasks').then(r=>r.json())]);
    setJobs(Array.isArray(j)?j:[]); setAllTasks(Array.isArray(t)?t:[]);
  }, []);

  useEffect(() => { load(); fetch('/api/ops/business-units').then(r=>r.json()).then(d=>setBus(Array.isArray(d)?d:[])).catch(()=>{}); fetch('/api/scripts').then(r=>r.json()).then(d=>setScripts(Array.isArray(d)?d:[])).catch(()=>{}); }, [load]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key==='n'||e.key==='N') { e.preventDefault(); setShowCreate(true); }
      if (e.key==='t'||e.key==='T') { e.preventDefault(); setBaseDate(getMonday(new Date())); setSelDay(ds(new Date())); }
      if (e.key==='1') { e.preventDefault(); setView('week'); }
      if (e.key==='2') { e.preventDefault(); setView('month'); }
      if (e.key==='3') { e.preventDefault(); setView('timeline'); }
      if (e.key==='ArrowLeft') { e.preventDefault(); if (selDay) { const d=new Date(selDay+'T12:00:00'); d.setDate(d.getDate()-1); setSelDay(ds(d)); } else nav(-1); }
      if (e.key==='ArrowRight') { e.preventDefault(); if (selDay) { const d=new Date(selDay+'T12:00:00'); d.setDate(d.getDate()+1); setSelDay(ds(d)); } else nav(1); }
      if (e.key==='Escape') { setSelDay(null); setShowCreate(false); setPubPrompt(null); setEditTitle(null); setEditTime(null); setMobSheet(null); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selDay]);

  const jwT = useMemo(() => {
    const tm: Record<string, Task[]> = {};
    for (const t of allTasks) { if (!tm[t.content_id]) tm[t.content_id]=[]; tm[t.content_id].push(t); }
    let f = jobs.map(j => ({...j, tasks: tm[j.id]||[]}));
    if (fPlat) f=f.filter(j=>j.platform===fPlat);
    if (fBU) f=f.filter(j=>j.business_unit_id===fBU);
    if (fStatus) f=f.filter(j=>j.status===fStatus);
    if (fAssign) f=f.filter(j=>(j.tasks||[]).some(t=>t.assigned_to===fAssign));
    return f;
  }, [jobs, allTasks, fPlat, fBU, fStatus, fAssign]);

  const today = new Date(); today.setHours(0,0,0,0); const todayStr = ds(today);

  const days = useMemo(() => {
    const r: Date[] = [];
    if (view==='week') { for(let i=0;i<7;i++){const d=new Date(baseDate);d.setDate(baseDate.getDate()+i);r.push(d);} }
    else { const st=new Date(baseDate.getFullYear(),baseDate.getMonth(),1); const sd=st.getDay(); for(let i=-sd;i<42-sd;i++){const d=new Date(st);d.setDate(st.getDate()+i);r.push(d);} }
    return r;
  }, [baseDate, view]);

  const jbd = useMemo(() => {
    const m: Record<string, Job[]> = {};
    for (const j of jwT) { if (!j.scheduled_for) continue; const d=ds(new Date(j.scheduled_for)); if(!m[d])m[d]=[]; m[d].push(j); }
    return m;
  }, [jwT]);

  const wbd = useMemo(() => {
    const m: Record<string,Record<string,number>> = {};
    for (const j of jwT) { if(!j.scheduled_for)continue; const d=ds(new Date(j.scheduled_for)); if(!m[d])m[d]={}; for(const t of(j.tasks||[])){if(t.status!=='done'&&t.tool){m[d][t.tool]=(m[d][t.tool]||0)+1;}} }
    return m;
  }, [jwT]);

  const insights = useMemo(() => {
    const od = jwT.filter(isOverdue), ar = jwT.filter(isAtRisk);
    const tj = jbd[todayStr]||[], tt = tj.reduce((s,j) => s+(j.tasks?.filter(t=>t.status!=='done').length||0), 0);
    let streak=0; const d=new Date(); d.setDate(d.getDate()-1);
    while(true){ const dd=ds(d); if(!(jbd[dd]||[]).some(j=>j.status==='published'))break; streak++; d.setDate(d.getDate()-1); if(streak>365)break; }
    const ws=getMonday(new Date()); let wp=0;
    for(let i=0;i<7;i++){const wd=new Date(ws);wd.setDate(ws.getDate()+i);wp+=(jbd[ds(wd)]||[]).filter(j=>j.status==='published').length;}
    return { od, ar, tt, streak, wp, wt:35, tp: jwT.filter(j=>j.status==='published').length, tj: jwT.filter(j=>j.scheduled_for).length };
  }, [jwT, jbd, todayStr]);

  const maxJpd = useMemo(() => Math.max(1,...Object.values(jbd).map(j=>j.length)), [jbd]);

  const nav = (dir: number) => {
    const d=new Date(baseDate);
    if(view==='week'||view==='timeline') d.setDate(d.getDate()+dir*7); else d.setMonth(d.getMonth()+dir);
    setBaseDate(view==='week'||view==='timeline'?getMonday(d):d);
  };

  const toggleTask = async (task: Task) => {
    const ns = task.status==='done'?'todo':'done';
    await fetch('/api/marketing/tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:task.id,status:ns})});
    if(ns==='done'&&task.task_name.toLowerCase().includes('publish')){setPubPrompt(task.content_id);setPubUrl('');}
    load();
  };
  const savePubUrl = async () => { if(!pubPrompt)return; await fetch('/api/marketing/content',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pubPrompt,published_url:pubUrl,status:'published'})}); setPubPrompt(null);setPubUrl('');load(); };
  const saveTitle = async (id:string,t:string) => { await fetch('/api/marketing/content',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,title:t})}); setEditTitle(null);load(); };
  const saveTime = async (id:string,t:string) => { await fetch('/api/marketing/content',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,scheduled_for:t})}); setEditTime(null);load(); };
  const qAssign = async (id:string,cur:string) => { const n=cur==='unassigned'?'Anthony':cur==='Anthony'?'clawd':'unassigned'; await fetch('/api/marketing/tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,assigned_to:n})}); load(); };

  const onDragStart = (id:string) => setDragId(id);
  const onDragOver = (e:React.DragEvent,d:string) => { e.preventDefault(); setDragOver(d); };
  const onDrop = async (e:React.DragEvent,target:string) => {
    e.preventDefault(); setDragOver(null); if(!dragId)return;
    const j=jwT.find(x=>x.id===dragId); if(!j||!j.scheduled_for){setDragId(null);return;}
    const ot=new Date(j.scheduled_for), nd=new Date(target+'T12:00:00'); nd.setHours(ot.getHours(),ot.getMinutes(),0,0);
    await fetch('/api/marketing/content',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:dragId,scheduled_for:nd.toISOString()})});
    setDragId(null); load();
  };

  const createJob = async () => {
    const body:any = {title:form.title,platform:form.platform,content_type:form.content_type,status:'idea',business_unit_id:form.business_unit_id||null,scheduled_for:form.scheduled_for||null,script_id:form.script_id||null,recurring_config:form.recurring?{pattern:form.recurring}:null};
    const res = await fetch('/api/marketing/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const c = await res.json();
    if(c.id){
      const tk=form.content_type==='tweet'?'tweet':form.platform;
      const tmpl=TEMPLATES[tk]||TEMPLATES.tiktok;
      await fetch('/api/marketing/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tmpl.map(t=>({content_id:c.id,...t,assigned_to:'unassigned',status:'todo'})))});
      if(form.recurring&&form.scheduled_for){
        const st=new Date(form.scheduled_for),copies:Date[]=[];
        for(let i=1;i<=4;i++){const d=new Date(st);if(form.recurring==='daily')d.setDate(d.getDate()+i);else if(form.recurring==='weekdays'){let a=0;const cd=new Date(copies.length?copies[copies.length-1]:st);while(a<1){cd.setDate(cd.getDate()+1);if(cd.getDay()!==0&&cd.getDay()!==6)a++;}d.setTime(cd.getTime());}else if(form.recurring==='weekly')d.setDate(d.getDate()+i*7);copies.push(d);}
        for(const cd of copies){const cb={...body,scheduled_for:cd.toISOString(),recurring_parent_id:c.id};const cr=await fetch('/api/marketing/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cb)}).then(r=>r.json());if(cr.id)await fetch('/api/marketing/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tmpl.map(t=>({content_id:cr.id,...t,assigned_to:'unassigned',status:'todo'})))});}
      }
    }
    setShowCreate(false); setForm({title:'',platform:'tiktok',content_type:'tiktok',business_unit_id:'',scheduled_for:'',recurring:'',script_id:''}); load();
  };

  const fillCalendar = async () => {
    setFilling(true);setFillMsg(null);
    const r=await fetch('/api/marketing/fill-calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({weekStart:baseDate.toISOString().split('T')[0]})});
    const d=await r.json(); setFilling(false); setFillMsg(`Created ${d.created} jobs (${d.totalThisWeek} total this week)`); load(); setTimeout(()=>setFillMsg(null),5000);
  };

  const openCreate = (d:string) => { setForm({...form,scheduled_for:d+'T10:00:00'}); setShowCreate(true); };
  const selJobs = selDay?(jbd[selDay]||[]):[];
  const selWork = selDay?(wbd[selDay]||{}):{};
  const hasFilters = fPlat||fBU||fStatus||fAssign;

  const weekDays = useMemo(() => { const r:Date[]=[]; for(let i=0;i<7;i++){const d=new Date(baseDate);d.setDate(baseDate.getDate()+i);r.push(d);} return r; }, [baseDate]);
  const tlData = useMemo(() => { const m:Record<string,Job[]>={}; for(const j of jwT){const n=j.ops_business_units?.name||'Unassigned';if(!m[n])m[n]=[];m[n].push(j);} return m; }, [jwT]);

  /* ═══ MOBILE ═══ */
  if (mobile) {
    const mJobs = jbd[mobDay]||[];
    return (
      <div className={s.mobilePage} onTouchStart={e=>{touchX.current=e.touches[0].clientX}} onTouchEnd={e=>{const d=e.changedTouches[0].clientX-touchX.current;if(Math.abs(d)>60){const dd=new Date(mobDay+'T12:00:00');dd.setDate(dd.getDate()+(d<0?1:-1));setMobDay(ds(dd));}}}>
        <div className={s.mobileHeader}>
          <h1 className={s.mobileTitle}>📅 Calendar</h1>
          <button className={s.newBtn} onClick={()=>setShowCreate(true)}>+ New</button>
        </div>
        <div className={s.dateStrip}>
          {Array.from({length:7},(_,i)=>{const d=new Date(mobDay+'T12:00:00');d.setDate(d.getDate()-3+i);const dd=ds(d);return(
            <button key={dd} onClick={()=>setMobDay(dd)} className={dd===mobDay?s.dateChipActive:s.dateChip}>
              <div className={s.dateChipDay}>{DN[d.getDay()]}</div>
              <div className={dd===todayStr?s.dateChipNumToday:s.dateChipNum}>{d.getDate()}</div>
            </button>
          );})}
        </div>
        <div className={s.mobileDateTitle}>
          {new Date(mobDay+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          <span className={s.mobileDateCount}>{mJobs.length} job{mJobs.length!==1?'s':''}</span>
        </div>
        {mJobs.length===0 && (
          <div className={s.mobileEmpty}>
            <div className={s.mobileEmptyIcon}>📭</div>
            <div style={{fontSize:'0.92rem',fontWeight:500,marginBottom:4}}>No jobs scheduled</div>
            <div style={{fontSize:'0.8rem',marginBottom:16}}>Swipe to change days or add a job</div>
            <button className={s.newBtn} onClick={()=>openCreate(mobDay)}>+ Add Job</button>
          </div>
        )}
        {mJobs.map(job => {
          const tasks=job.tasks||[], done=tasks.filter(t=>t.status==='done').length, total=tasks.length, color=compColor(tasks);
          return (
            <div key={job.id} className={s.mobileJobCard} onClick={()=>setMobSheet(job.id)} style={{borderLeft:`4px solid ${color}`}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:'1.2rem'}}>{PI[job.platform]}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:'0.9rem'}}>{job.title}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-tertiary)',marginTop:2}}>
                    {job.ops_business_units?.name||'Unassigned'}
                    {job.scheduled_for&&` · ${new Date(job.scheduled_for).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`}
                  </div>
                </div>
                <div style={{fontSize:'0.8rem',fontWeight:650,color}}>{done}/{total}</div>
              </div>
              {total>0&&<div className={s.progressWrap} style={{marginTop:8}}><div className={s.progressTrack} style={{height:5}}><div className={s.progressFill} style={{width:`${(done/total)*100}%`,background:color}}/></div></div>}
              {job.script_id&&<div style={{fontSize:'0.72rem',marginTop:6,color:'var(--green)'}}>📜 Script attached</div>}
            </div>
          );
        })}
        {mobSheet&&(()=>{const job=jwT.find(j=>j.id===mobSheet);if(!job)return null;const tasks=job.tasks||[];return(
          <div className={s.sheetOverlay} onClick={()=>setMobSheet(null)}>
            <div className={s.sheet} onClick={e=>e.stopPropagation()}>
              <div className={s.sheetHandle}/>
              <div className={s.sheetTitle}><span style={{fontSize:'1.2rem'}}>{PI[job.platform]}</span>{job.title}</div>
              {tasks.sort((a,b)=>a.sort_order-b.sort_order).map(task=>(
                <div key={task.id} className={cx(s.taskRow,task.status==='done'&&s.taskRowDone)}>
                  <button className={task.status==='done'?s.checkboxChecked:s.checkbox} onClick={()=>toggleTask(task)}>{task.status==='done'?'✓':''}</button>
                  <span className={s.taskSkill}>{SL[task.skill_required]||'📋'}</span>
                  <span className={task.status==='done'?s.taskNameDone:s.taskName}>{task.task_name}</span>
                  <span className={task.assigned_to==='Anthony'?s.assignAnthony:task.assigned_to==='clawd'?s.assignClawd:s.assignUnassigned} onClick={()=>qAssign(task.id,task.assigned_to)}>{task.assigned_to}</span>
                </div>
              ))}
            </div>
          </div>
        );})()}
        {showCreate && renderModal()}
      </div>
    );
  }

  /* ═══ CREATE MODAL ═══ */
  function renderModal() {
    const showScript = ['tiktok','youtube'].includes(form.platform);
    const tmpl = TEMPLATES[form.content_type]||TEMPLATES.tiktok;
    return (
      <div className={s.overlay} onClick={()=>setShowCreate(false)}>
        <div className={s.modal} onClick={e=>e.stopPropagation()}>
          <div className={s.modalTitle}>✨ New Production Job</div>
          <label className="modal-label">Title</label>
          <input className="modal-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Honey Bunny - Monday Video 1" autoFocus />
          <div className={s.modalGrid}>
            <div><label className="modal-label">Platform</label><select className="modal-select" value={form.platform} onChange={e=>setForm({...form,platform:e.target.value,content_type:e.target.value})}>{Object.entries(PI).map(([p,i])=><option key={p} value={p}>{i} {p}</option>)}</select></div>
            <div><label className="modal-label">Content Type</label><select className="modal-select" value={form.content_type} onChange={e=>setForm({...form,content_type:e.target.value})}>{['tiktok','tweet','instagram','youtube'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div className={s.modalGrid}>
            <div><label className="modal-label">Business Unit</label><select className="modal-select" value={form.business_unit_id} onChange={e=>setForm({...form,business_unit_id:e.target.value})}><option value="">Select…</option>{bus.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><label className="modal-label">Repeat</label><select className="modal-select" value={form.recurring} onChange={e=>setForm({...form,recurring:e.target.value})}><option value="">None</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select></div>
          </div>
          <label className="modal-label">Scheduled Date/Time</label>
          <input className="modal-input" type="datetime-local" value={form.scheduled_for} onChange={e=>setForm({...form,scheduled_for:e.target.value})} />
          {showScript&&<><label className="modal-label">Attach Script</label><select className="modal-select" value={form.script_id} onChange={e=>setForm({...form,script_id:e.target.value})}><option value="">No script</option>{scripts.map(x=><option key={x.id} value={x.id}>📜 {x.title} ({x.series_name})</option>)}</select></>}
          {form.recurring&&<div className={s.recurNotice}>🔁 Will create 4 additional copies ({form.recurring})</div>}
          <div className={s.templatePreview}>
            <div className={s.templateTitle}>Tasks (auto-created)</div>
            {tmpl.map((t,i)=><div key={i} className={s.templateRow}><span className={s.templateNum}>{i+1}.</span><span>{SL[t.skill_required]}</span><span style={{flex:1}}>{t.task_name}</span><span className={s.templateTool}>{TL[t.tool]}</span></div>)}
          </div>
          <div className={s.modalActions}>
            <button className={s.cancelBtn} onClick={()=>setShowCreate(false)}>Cancel</button>
            <button className={s.submitBtn} onClick={createJob} disabled={!form.title}>Create Job</button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ JOB CARD (grid) ═══ */
  function renderCard(job: Job, compact=false) {
    const tasks=job.tasks||[], done=tasks.filter(t=>t.status==='done').length, total=tasks.length, color=compColor(tasks);
    const od=isOverdue(job), ar=isAtRisk(job);
    return (
      <div key={job.id} draggable onDragStart={()=>onDragStart(job.id)} onDragEnd={()=>{setDragId(null);setDragOver(null);}}
        className={cx(s.jobCard, od&&s.jobCardOverdue, ar&&s.jobCardAtRisk, dragId===job.id&&s.jobCardDragging)}
        style={{'--card-color':od?'var(--rose)':ar?'var(--amber)':color} as any}>
        <style>{`.${s.jobCard}::before { background: var(--card-color, var(--border-subtle)); }`}</style>
        <div className={s.jobCardRow}>
          <span className={s.jobCardIcon}>{PI[job.platform]}</span>
          <span className={s.jobCardTitle}>{job.title}</span>
          {job.script_id&&<span className={s.jobCardBadge} title="Script attached">📜</span>}
          {job.recurring_parent_id&&<span className={s.jobCardBadge} title="Recurring">🔁</span>}
        </div>
        {total>0&&!compact&&(
          <div className={s.progressWrap}>
            <div className={s.progressTrack}><div className={s.progressFill} style={{width:`${(done/total)*100}%`,background:color}}/></div>
            <span className={s.progressLabel}>{done}/{total}</span>
          </div>
        )}
      </div>
    );
  }

  function heatClass(count: number) {
    if (count<=0) return '';
    const r = count / maxJpd;
    if (r <= 0.2) return s.heatmap1;
    if (r <= 0.4) return s.heatmap2;
    if (r <= 0.6) return s.heatmap3;
    if (r <= 0.8) return s.heatmap4;
    return s.heatmap5;
  }

  /* ═══ MAIN ═══ */
  return (
    <div className={s.page} tabIndex={0}>
      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <h1 className={s.headerTitle}><span className={s.headerTitleIcon}>📅</span> Production Calendar</h1>
          <div className={s.headerSub}>
            <span>Plan, track & ship content</span>
            <div className={s.kbdHints}>
              <kbd className={s.kbdHint}>N</kbd><span>new</span>
              <kbd className={s.kbdHint}>T</kbd><span>today</span>
              <kbd className={s.kbdHint}>1-3</kbd><span>views</span>
            </div>
          </div>
        </div>
        <div className={s.headerRight}>
          <span className={s.statPill}>📊 {insights.tp}/{insights.tj} published</span>
          <button className={s.iconBtn} onClick={()=>setShowFilters(!showFilters)}>
            🔍 Filter {hasFilters&&<span className={s.filterDot}/>}
          </button>
          <button className={s.iconBtn} onClick={()=>setShowInsights(!showInsights)}>
            {showInsights?'📉':'📈'} Insights
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      {showFilters && (
        <div className={s.filtersPanel}>
          <span className={s.filtersLabel}>Filters</span>
          <select className={s.filterSelect} value={fPlat} onChange={e=>setFPlat(e.target.value)}><option value="">All Platforms</option>{Object.keys(PI).map(p=><option key={p} value={p}>{PI[p]} {p}</option>)}</select>
          <select className={s.filterSelect} value={fBU} onChange={e=>setFBU(e.target.value)}><option value="">All Units</option>{bus.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select className={s.filterSelect} value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">All Statuses</option>{['idea','scripted','producing','review','scheduled','published'].map(x=><option key={x} value={x}>{x}</option>)}</select>
          <select className={s.filterSelect} value={fAssign} onChange={e=>setFAssign(e.target.value)}><option value="">All Assignees</option>{ASSIGNEES.map(a=><option key={a} value={a}>{a}</option>)}</select>
          {hasFilters&&<button className={s.filterClear} onClick={()=>{setFPlat('');setFBU('');setFStatus('');setFAssign('');}}>✕ Clear</button>}
        </div>
      )}

      {/* ── Insights ── */}
      {showInsights && (
        <div className={s.insightsGrid}>
          <div className={s.insightCard}><div className={s.insightLabel}>Today&apos;s Tasks</div><div className={s.insightValue} style={{color:'var(--accent)'}}>{insights.tt}</div><div className={s.insightSub}>remaining</div></div>
          <div className={insights.od.length?s.insightCardDanger:s.insightCard}><div className={s.insightLabel} style={insights.od.length?{color:'var(--rose)'}:undefined}>Overdue</div><div className={s.insightValue} style={{color:insights.od.length?'var(--rose)':'var(--text-primary)'}}>{insights.od.length}</div><div className={s.insightSub}>jobs</div></div>
          <div className={insights.ar.length?s.insightCardWarning:s.insightCard}><div className={s.insightLabel} style={insights.ar.length?{color:'var(--amber)'}:undefined}>At Risk</div><div className={s.insightValue} style={{color:insights.ar.length?'var(--amber)':'var(--text-primary)'}}>{insights.ar.length}</div><div className={s.insightSub}>due &lt;24h</div></div>
          <div className={s.insightCard}><div className={s.insightLabel}>Pub Streak</div><div className={s.insightValue} style={{color:insights.streak?'var(--green)':'var(--text-primary)'}}><span className={insights.streak?s.streakFire:undefined}>🔥</span> {insights.streak}</div><div className={s.insightSub}>days</div></div>
          <div className={s.insightCard}><div className={s.insightLabel}>Weekly Rate</div><div className={s.insightValue} style={{color:insights.wp>=insights.wt?'var(--green)':'var(--amber)'}}>{insights.wp}/{insights.wt}</div><div className={s.miniBar}><div className={s.miniBarFill} style={{width:`${Math.min(100,(insights.wp/insights.wt)*100)}%`,background:insights.wp>=insights.wt?'var(--green)':'var(--amber)'}}/></div></div>
        </div>
      )}

      {/* ── Nav ── */}
      <div className={s.navBar}>
        <div className={s.navLeft}>
          <button className={s.navBtn} onClick={()=>nav(-1)}>←</button>
          <button className={s.todayBtn} onClick={()=>{setBaseDate(getMonday(new Date()));setSelDay(todayStr);}}>Today</button>
          <button className={s.navBtn} onClick={()=>nav(1)}>→</button>
          <span className={s.dateLabel}>
            {view==='month'?baseDate.toLocaleDateString('en-US',{month:'long',year:'numeric'}):`${baseDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})} — ${new Date(baseDate.getTime()+6*86400000).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`}
          </span>
        </div>
        <div className={s.navRight}>
          {(['week','month','timeline'] as const).map(v=>(
            <button key={v} className={view===v?s.viewBtnActive:s.viewBtn} onClick={()=>setView(v)}>
              {v==='timeline'?'📊 Timeline':v==='month'?'📅 Month':'📅 Week'}
            </button>
          ))}
          <button className={s.fillBtn} onClick={fillCalendar} disabled={filling}>{filling?'⏳ Filling…':'⚡ Fill Calendar'}</button>
          <button className={s.newBtn} onClick={()=>setShowCreate(true)}>+ New Job</button>
        </div>
      </div>

      {fillMsg&&<div className={s.fillNotice}>✅ {fillMsg}</div>}

      {/* ═══ TIMELINE ═══ */}
      {view==='timeline'&&(
        <div className={s.timeline}>
          <div className={s.timelineHeader}>
            <div className={s.timelineCorner}>Business Unit</div>
            {weekDays.map(d=><div key={ds(d)} className={ds(d)===todayStr?s.timelineDayHeaderToday:s.timelineDayHeader}>{DN[d.getDay()]} {d.getDate()}</div>)}
          </div>
          {Object.entries(tlData).map(([name,bJobs])=>(
            <div key={name} className={s.timelineRow}>
              <div className={s.timelineRowLabel}>{name}</div>
              {weekDays.map(d=>{const dd=ds(d);const dj=bJobs.filter(j=>j.scheduled_for&&ds(new Date(j.scheduled_for))===dd);return(
                <div key={dd} className={cx(s.timelineCell,dd===todayStr&&s.timelineCellToday)} onDragOver={e=>onDragOver(e,dd)} onDrop={e=>onDrop(e,dd)}>
                  {dj.map(job=>{const tasks=job.tasks||[],done=tasks.filter(t=>t.status==='done').length,total=tasks.length,pct=total?done/total:0;return(
                    <div key={job.id} className={s.timelineJob} draggable onDragStart={()=>onDragStart(job.id)} onClick={()=>{setSelDay(dd);setExpJob(job.id);}}>
                      <div className={s.timelineJobBar}><div className={s.timelineJobBarFill} style={{width:`${pct*100}%`,background:SC[job.status]||'var(--accent)'}}/></div>
                      <div className={s.timelineJobContent}><span>{PI[job.platform]}</span><span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{job.title}</span></div>
                    </div>
                  );})}
                </div>
              );})}
            </div>
          ))}
          {!Object.keys(tlData).length&&<div className={s.timelineEmpty}>No jobs with business units assigned</div>}
        </div>
      )}

      {/* ═══ WEEK/MONTH GRID ═══ */}
      {(view==='week'||view==='month')&&(
        <div className={s.gridWrapper}>
          <div className={s.dayHeaders}>{DN.map(d=><div key={d} className={s.dayHeader}>{d}</div>)}</div>
          <div className={s.calGrid}>
            {days.map((day,i)=>{
              const dd=ds(day),isT=dd===todayStr,isSel=selDay===dd,isCur=day.getMonth()===baseDate.getMonth(),dj=jbd[dd]||[],dw=wbd[dd]||{},isDO=dragOver===dd;
              const limit = view==='week'?4:2;
              return (
                <div key={i}
                  onClick={()=>setSelDay(isSel?null:dd)}
                  onDragOver={e=>onDragOver(e,dd)} onDragLeave={()=>setDragOver(null)} onDrop={e=>onDrop(e,dd)}
                  className={cx(
                    view==='week'?s.dayCellWeek:s.dayCellMonth,
                    isT&&s.dayCellToday, isSel&&s.dayCellSelected, isDO&&s.dayCellDragOver,
                    (!isCur&&view==='month')&&s.dayCellOtherMonth,
                    view==='month'&&dj.length>0&&heatClass(dj.length),
                  )}>
                  <div className={s.dayNumber}>
                    <span className={isT?s.dayNumToday:s.dayNum}>{day.getDate()}</span>
                    {dj.length>0&&<span className={s.dayCount}>{dj.length}</span>}
                  </div>
                  {dj.slice(0,limit).map(job=>renderCard(job,view==='month'))}
                  {dj.length>limit&&<div className={s.moreCount}>+{dj.length-limit} more</div>}
                  {view==='week'&&Object.keys(dw).length>0&&(
                    <div className={s.workloadPills}>{Object.entries(dw).slice(0,3).map(([tool,count])=><span key={tool} className={s.workloadPill}>{TL[tool]?.split(' ')[0]||tool} ×{count}</span>)}</div>
                  )}
                  {dj.length===0&&view==='week'&&(
                    <div className={s.emptyDay} onClick={e=>{e.stopPropagation();openCreate(dd);}}>
                      <div className={s.emptyDayIcon}>＋</div>
                      <div className={s.emptyDayText}>Add content</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ DETAIL PANEL ═══ */}
      {selDay&&(
        <div className={s.detailPanel}>
          <div className={s.detailHeader}>
            <h3 className={s.detailDateTitle}>
              {new Date(selDay+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
              <span className={s.detailDateCount}>{selJobs.length} job{selJobs.length!==1?'s':''}</span>
            </h3>
            <button className={s.detailAddBtn} onClick={()=>openCreate(selDay)}>＋ Add Job</button>
          </div>
          <div className={s.detailBody}>
            {Object.keys(selWork).length>0&&(
              <div className={s.workloadBar}>
                <span className={s.workloadLabel}>Tools</span>
                {Object.entries(selWork).map(([tool,count])=><span key={tool} className={s.workloadChip}>{TL[tool]||tool} ×{count as number}</span>)}
              </div>
            )}
            {selJobs.length===0&&(
              <div className={s.emptyDetail}>
                <div className={s.emptyDetailIcon}>📭</div>
                <div className={s.emptyDetailTitle}>No jobs scheduled</div>
                <div className={s.emptyDetailSub}>Click &quot;Add Job&quot; to schedule content for this day</div>
                <button className={s.newBtn} onClick={()=>openCreate(selDay)} style={{marginTop:4}}>+ Create Job</button>
              </div>
            )}
            {selJobs.map(job=>{
              const tasks=job.tasks||[],done=tasks.filter(t=>t.status==='done').length,total=tasks.length,isExp=expJob===job.id,color=compColor(tasks),od=isOverdue(job),ar=isAtRisk(job);
              return(
                <div key={job.id} className={cx(s.detailJob,od&&s.detailJobOverdue,ar&&s.detailJobAtRisk)}>
                  <div className={cx(s.detailJobHeader,isExp&&s.detailJobExpanded)} onClick={()=>setExpJob(isExp?null:job.id)}>
                    <div className={s.platformIcon}>{PI[job.platform]}</div>
                    <div className={s.detailJobInfo}>
                      {editTitle===job.id?(
                        <input className={s.inlineInput} autoFocus value={editTitleVal} onChange={e=>setEditTitleVal(e.target.value)}
                          onBlur={()=>{if(editTitleVal.trim())saveTitle(job.id,editTitleVal);else setEditTitle(null);}}
                          onKeyDown={e=>{if(e.key==='Enter'&&editTitleVal.trim())saveTitle(job.id,editTitleVal);if(e.key==='Escape')setEditTitle(null);}}
                          onClick={e=>e.stopPropagation()} style={{fontSize:'0.92rem',fontWeight:600}}/>
                      ):(
                        <div className={s.detailJobTitle} onClick={e=>{e.stopPropagation();setEditTitle(job.id);setEditTitleVal(job.title);}}>
                          {job.title}
                          {od&&<span className={cx(s.statusBadge,s.statusOverdue)}>Overdue</span>}
                          {ar&&<span className={cx(s.statusBadge,s.statusAtRisk)}>At Risk</span>}
                        </div>
                      )}
                      <div className={s.detailJobMeta}>
                        <span className={s.metaItem}>{job.ops_business_units?.name||'Unassigned'}</span>
                        {editTime===job.id?(
                          <input type="datetime-local" className={s.inlineInput} autoFocus value={editTimeVal} onChange={e=>setEditTimeVal(e.target.value)}
                            onBlur={()=>{if(editTimeVal)saveTime(job.id,editTimeVal);else setEditTime(null);}}
                            onKeyDown={e=>{if(e.key==='Enter'&&editTimeVal)saveTime(job.id,editTimeVal);if(e.key==='Escape')setEditTime(null);}}
                            onClick={e=>e.stopPropagation()} style={{width:'auto',fontSize:'0.72rem',padding:'1px 6px'}}/>
                        ):(
                          <span className={cx(s.metaItem,s.metaItemClickable)} onClick={e=>{e.stopPropagation();setEditTime(job.id);setEditTimeVal(job.scheduled_for?new Date(job.scheduled_for).toISOString().slice(0,16):'');}}>
                            🕐 {job.scheduled_for?new Date(job.scheduled_for).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'set time'}
                          </span>
                        )}
                        {job.script_id?<Link href="/scripts/library" onClick={e=>e.stopPropagation()} className={cx(s.scriptBadge,s.scriptAttached)}>📜 Script ✓</Link>:<span className={cx(s.scriptBadge,s.scriptMissing)}>📜 None</span>}
                        {job.recurring_parent_id&&<span className={s.metaItem} style={{color:'var(--purple)'}}>🔁 Recurring</span>}
                        {job.published_url&&<a href={job.published_url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className={s.metaItem} style={{color:'var(--green)'}}>🔗 Published</a>}
                      </div>
                    </div>
                    <div className={s.detailJobRight}>
                      <Link href="/marketing/content" onClick={e=>e.stopPropagation()} className={s.pipelineLink}>Pipeline →</Link>
                      <div className={s.detailProgress}><div className={s.detailProgressFill} style={{width:total?`${(done/total)*100}%`:'0%',background:color}}/></div>
                      <span className={s.detailProgressLabel} style={{color}}>{done}/{total}</span>
                      <span className={cx(s.expandChevron,isExp&&s.expandChevronOpen)}>▶</span>
                    </div>
                  </div>
                  {isExp&&(
                    <div className={s.tasksList}>
                      {tasks.sort((a,b)=>a.sort_order-b.sort_order).map(task=>(
                        <div key={task.id} className={cx(s.taskRow,task.status==='done'&&s.taskRowDone)}>
                          <button className={task.status==='done'?s.checkboxChecked:s.checkbox} onClick={()=>toggleTask(task)}>{task.status==='done'?'✓':''}</button>
                          <span className={s.taskSkill}>{SL[task.skill_required]||'📋'}</span>
                          <span className={task.status==='done'?s.taskNameDone:s.taskName}>{task.task_name}</span>
                          <span className={s.toolBadge}>{TL[task.tool]||task.tool}</span>
                          <span className={task.assigned_to==='Anthony'?s.assignAnthony:task.assigned_to==='clawd'?s.assignClawd:s.assignUnassigned} onClick={()=>qAssign(task.id,task.assigned_to)}>{task.assigned_to}</span>
                        </div>
                      ))}
                      {!tasks.length&&<div style={{padding:'12px 0',color:'var(--text-tertiary)',fontSize:'0.84rem'}}>No tasks yet</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ MODALS ═══ */}
      {showCreate&&renderModal()}
      {pubPrompt&&(
        <div className={s.overlay} onClick={()=>setPubPrompt(null)}>
          <div className={s.modalSmall} onClick={e=>e.stopPropagation()}>
            <div className={s.publishIcon}>🎉</div>
            <div className={s.modalTitle} style={{textAlign:'center'}}>Content Published!</div>
            <div className={s.publishText}>Enter the published URL to track it:</div>
            <input className="modal-input" value={pubUrl} onChange={e=>setPubUrl(e.target.value)} placeholder="https://tiktok.com/…" autoFocus />
            <div className={s.modalActions}>
              <button className={s.cancelBtn} onClick={()=>setPubPrompt(null)}>Skip</button>
              <button className={s.submitBtn} onClick={savePubUrl}>Save URL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
