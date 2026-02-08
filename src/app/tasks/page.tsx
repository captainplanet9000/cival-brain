'use client';

import { useEffect, useState, useCallback } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  tags: string[];
}

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'var(--text-tertiary)' },
  { key: 'in-progress', label: 'In Progress', color: 'var(--accent)' },
  { key: 'review', label: 'Review', color: 'var(--amber)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];

const PRIORITIES: { key: string; label: string; color: string }[] = [
  { key: 'low', label: 'Low', color: 'var(--text-tertiary)' },
  { key: 'medium', label: 'Medium', color: 'var(--accent)' },
  { key: 'high', label: 'High', color: 'var(--amber)' },
  { key: 'critical', label: 'Critical', color: 'var(--rose)' },
];

const priorityColor = (p: string) => PRIORITIES.find(pr => pr.key === p)?.color || 'var(--text-tertiary)';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: '', description: '', status: 'backlog', priority: 'medium', tags: '' });
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/tasks').then(r => r.json()).then(setTasks);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = (status = 'backlog') => {
    setForm({ title: '', description: '', status, priority: 'medium', tags: '' });
    setEditTask(null);
    setModal('add');
  };

  const openEdit = (t: Task) => {
    setForm({ title: t.title, description: t.description, status: t.status, priority: t.priority, tags: t.tags.join(', ') });
    setEditTask(t);
    setModal('edit');
  };

  const save = async () => {
    const tags = form.tags.split(',').map(s => s.trim()).filter(Boolean);
    if (modal === 'add') {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags }),
      });
    } else if (modal === 'edit' && editTask) {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editTask.id, tags }),
      });
    }
    setModal(null);
    load();
  };

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    load();
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (!dragId) return;
    const task = tasks.find(t => t.id === dragId);
    if (!task || task.status === status) { setDragId(null); return; }
    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dragId, status }),
    });
    setDragId(null);
    load();
  };

  return (
    <div className="page-container">
      <div className="kanban-header">
        <h1>Task Board</h1>
        <button className="btn-primary" onClick={() => openAdd()}>+ New Task</button>
      </div>
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div
              key={col.key}
              className="kanban-column"
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, col.key)}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-dot" style={{ background: col.color }} />
                <span className="kanban-col-title">{col.label}</span>
                <span className="kanban-col-count">{colTasks.length}</span>
                <button className="kanban-col-add" onClick={() => openAdd(col.key)} title="Add task">+</button>
              </div>
              <div className="kanban-col-body">
                {colTasks.map(t => (
                  <div
                    key={t.id}
                    className={`kanban-card${dragId === t.id ? ' dragging' : ''}`}
                    draggable
                    onDragStart={e => onDragStart(e, t.id)}
                    onClick={() => openEdit(t)}
                  >
                    <div className="kanban-card-top">
                      <span className="kanban-priority-dot" style={{ background: priorityColor(t.priority) }} title={t.priority} />
                      <span className="kanban-card-title">{t.title}</span>
                    </div>
                    {t.description && <div className="kanban-card-desc">{t.description.slice(0, 80)}{t.description.length > 80 ? '…' : ''}</div>}
                    {t.tags.length > 0 && (
                      <div className="kanban-card-tags">
                        {t.tags.map(tag => <span key={tag} className="kanban-tag">{tag}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'New Task' : 'Edit Task'}</h2>
            <label className="modal-label">Title</label>
            <input className="modal-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            <label className="modal-label">Description</label>
            <textarea className="modal-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            <div className="modal-row">
              <div>
                <label className="modal-label">Status</label>
                <select className="modal-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="modal-label">Priority</label>
                <select className="modal-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <label className="modal-label">Tags (comma-separated)</label>
            <input className="modal-input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            <div className="modal-actions">
              {modal === 'edit' && editTask && (
                <button className="btn-danger" onClick={() => { deleteTask(editTask.id); setModal(null); }}>Delete</button>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
