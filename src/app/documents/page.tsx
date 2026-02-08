'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import hljs from 'highlight.js';

interface DocMeta {
  title: string;
  slug: string;
  category: string;
  categoryLabel: string;
  modified: string;
  wordCount: number;
  readingTime: number;
}

interface DocFull extends DocMeta {
  content: string;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  doc?: DocMeta;
}

function highlightCode(code: string, lang: string): string {
  if (lang && hljs.getLanguage(lang)) {
    try { return hljs.highlight(code, { language: lang }).value; } catch { /* skip */ }
  }
  try { return hljs.highlightAuto(code).value; } catch { /* skip */ }
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      const highlighted = highlightCode(code.trimEnd(), lang);
      return `<pre><code class="hljs${lang ? ` language-${lang}` : ''}">${highlighted}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^###\s+(.+)$/gm, (_m, t) => `<h3 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${t}</h3>`)
    .replace(/^##\s+(.+)$/gm, (_m, t) => `<h2 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${t}</h2>`)
    .replace(/^#\s+(.+)$/gm, (_m, t) => `<h1 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${t}</h1>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- \[x\]\s+(.+)$/gm, '<li class="task done"><input type="checkbox" checked disabled> $1</li>')
    .replace(/^- \[ \]\s+(.+)$/gm, '<li class="task"><input type="checkbox" disabled> $1</li>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---+$/gm, '<hr>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');
  html = html.replace(/((?:<li[\s>][\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');
  return `<p>${html}</p>`;
}

function buildTree(docs: DocMeta[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const doc of docs) {
    const parts = doc.slug.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const p = parts.slice(0, i + 1).join('/');
      let node = current.find(n => n.path === p);
      if (!node) {
        node = { name, path: p, children: [] };
        current.push(node);
      }
      if (i === parts.length - 1) node.doc = doc;
      current = node.children;
    }
  }
  return root;
}

function TreeItem({ node, activeSlug, onSelect, depth = 0 }: { node: TreeNode; activeSlug: string | null; onSelect: (slug: string) => void; depth?: number }) {
  const [open, setOpen] = useState(true);
  const isFolder = node.children.length > 0 && !node.doc;
  const isActive = node.doc && node.doc.slug === activeSlug;
  const cleanName = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (isFolder) {
    return (
      <div>
        <div
          className="tree-folder"
          style={{ paddingLeft: depth * 14 + 8 }}
          onClick={() => setOpen(!open)}
        >
          <span className="tree-chevron">{open ? '▾' : '▸'}</span>
          <span className="tree-folder-icon">📁</span>
          {cleanName(node.name)}
        </div>
        {open && node.children.map(c => (
          <TreeItem key={c.path} node={c} activeSlug={activeSlug} onSelect={onSelect} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`tree-file${isActive ? ' active' : ''}`}
      style={{ paddingLeft: depth * 14 + 8 }}
      onClick={() => node.doc && onSelect(node.doc.slug)}
    >
      <span className="tree-file-icon">📝</span>
      {cleanName(node.name)}
    </div>
  );
}

function DocumentsPageInner() {
  const searchParams = useSearchParams();
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocFull | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [newContent, setNewContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/documents').then(r => r.json()).then((d: DocMeta[]) => {
      setDocs(d);
      const docParam = searchParams.get('doc');
      if (docParam) setActiveSlug(docParam);
    });
  }, [searchParams]);

  useEffect(() => {
    if (!activeSlug) { setActiveDoc(null); return; }
    fetch(`/api/documents/${activeSlug}`).then(r => r.json()).then(setActiveDoc);
  }, [activeSlug]);

  const selectDoc = useCallback((slug: string) => {
    setActiveSlug(slug);
    setEditing(false);
    setCreating(false);
  }, []);

  const filteredDocs = useMemo(() => {
    if (!search) return docs;
    const q = search.toLowerCase();
    return docs.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.slug.toLowerCase().includes(q) ||
      d.categoryLabel.toLowerCase().includes(q)
    );
  }, [docs, search]);

  const tree = useMemo(() => buildTree(filteredDocs), [filteredDocs]);

  const startEdit = () => {
    if (!activeDoc) return;
    setEditContent(activeDoc.content);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!activeDoc) return;
    // Derive filepath from slug
    const slug = activeDoc.slug;
    let filepath = '';
    if (slug.startsWith('notes/')) filepath = slug.replace('notes/', '') + '.md';
    else if (slug.startsWith('projects/')) filepath = 'projects/' + slug.split('/').slice(1).join('/') + '.md';
    else if (slug.startsWith('areas/')) filepath = 'areas/' + slug.split('/').slice(1).join('/') + '.md';
    else if (slug.startsWith('resources/')) filepath = 'resources/' + slug.split('/').slice(1).join('/') + '.md';
    else if (slug.startsWith('archive/')) filepath = 'archive/' + slug.split('/').slice(1).join('/') + '.md';
    else {
      alert('Cannot edit this document type');
      return;
    }

    await fetch('/api/documents/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath, content: editContent }),
    });
    setEditing(false);
    // Reload
    const res = await fetch(`/api/documents/${slug}`);
    setActiveDoc(await res.json());
  };

  const createDoc = async () => {
    if (!newFilename.trim()) return;
    const filename = newFilename.endsWith('.md') ? newFilename : newFilename + '.md';
    await fetch('/api/documents/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath: filename, content: newContent || `# ${newFilename.replace(/\.md$/, '')}\n\n` }),
    });
    setCreating(false);
    setNewFilename('');
    setNewContent('');
    // Reload docs
    const r = await fetch('/api/documents');
    setDocs(await r.json());
  };

  const cleanName = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="docs-layout">
      {/* Sidebar */}
      <aside className="docs-sidebar">
        <div className="docs-sidebar-header">
          <input
            className="docs-search"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-small" onClick={() => setCreating(true)} title="New document">+</button>
        </div>
        <div className="docs-tree">
          {tree.map(n => (
            <TreeItem key={n.path} node={n} activeSlug={activeSlug} onSelect={selectDoc} />
          ))}
        </div>
      </aside>

      {/* Content */}
      <main className="docs-main">
        {creating ? (
          <div className="docs-create">
            <h2>New Document</h2>
            <label className="modal-label">Filename (under notes/)</label>
            <input className="modal-input" value={newFilename} onChange={e => setNewFilename(e.target.value)} placeholder="my-document.md" autoFocus />
            <label className="modal-label">Content</label>
            <textarea className="modal-textarea" value={newContent} onChange={e => setNewContent(e.target.value)} rows={12} placeholder="# My Document" />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn-primary" onClick={createDoc}>Create</button>
            </div>
          </div>
        ) : activeDoc ? (
          <div className="doc-view">
            <div className="doc-view-header">
              <div>
                <div className="doc-view-title">{cleanName(activeDoc.title)}</div>
                <div className="doc-view-meta">
                  <span className={`badge badge-${activeDoc.category}`}>{activeDoc.categoryLabel}</span>
                  <span>{fmtDate(activeDoc.modified)}</span>
                  <span>{activeDoc.wordCount} words</span>
                  <span>{activeDoc.readingTime} min read</span>
                </div>
              </div>
              <button className="btn-secondary" onClick={editing ? saveEdit : startEdit}>
                {editing ? 'Save' : 'Edit'}
              </button>
            </div>
            {editing ? (
              <textarea
                ref={textareaRef}
                className="doc-editor"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
              />
            ) : (
              <div className="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(activeDoc.content) }} />
            )}
          </div>
        ) : (
          <div className="docs-empty">
            <div className="docs-empty-icon">📄</div>
            <p>Select a document from the sidebar</p>
            <p className="docs-empty-sub">or <button className="link-btn" onClick={() => setCreating(true)}>create a new one</button></p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}>
      <DocumentsPageInner />
    </Suspense>
  );
}
