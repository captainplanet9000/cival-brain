import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const NOTES_DIR = path.join(CONTENT_DIR, 'notes');
const MEMORY_DIR = path.join(CONTENT_DIR, 'memory');
const MEMORY_FILE = path.join(CONTENT_DIR, 'MEMORY.md');

export interface DocMeta {
  title: string;
  slug: string;
  category: string;
  categoryLabel: string;
  modified: string;
  wordCount: number;
  readingTime: number;
}

export interface DocFull extends DocMeta {
  content: string;
  frontmatter: Record<string, unknown>;
}

function titleCase(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function deriveTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return titleCase(filename.replace(/\.md$/, ''));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function isJournalFile(name: string): boolean {
  return /^\d{4}-\d{2}-\d{2}\.md$/.test(name);
}

function readMdFiles(dir: string, category: string, categoryLabel: string): DocFull[] {
  const docs: DocFull[] = [];
  if (!fs.existsSync(dir)) return docs;
  
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch { return docs; }

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const fullPath = path.join(dir, entry);
    
    try {
      const stat = fs.lstatSync(fullPath);
      if (!stat.isFile()) continue;
      
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data: frontmatter, content } = matter(raw);
      const wc = wordCount(content);
      const title = (frontmatter.title as string) || deriveTitle(raw, entry);
      const slug = `${category}/${entry.replace(/\.md$/, '')}`;

      docs.push({
        title,
        slug,
        category,
        categoryLabel,
        modified: stat.mtime.toISOString(),
        wordCount: wc,
        readingTime: Math.max(1, Math.round(wc / 200)),
        content,
        frontmatter,
      });
    } catch { /* skip unreadable */ }
  }
  return docs;
}

export function getAllDocuments(): DocFull[] {
  const docs: DocFull[] = [];

  // PARA categories
  const paraCategories = [
    { dir: 'projects', label: '🚀 Projects', cat: 'projects' },
    { dir: 'areas', label: '🔄 Areas', cat: 'areas' },
    { dir: 'resources', label: '📚 Resources', cat: 'resources' },
    { dir: 'archive', label: '📦 Archive', cat: 'archive' },
  ];

  for (const { dir, label, cat } of paraCategories) {
    docs.push(...readMdFiles(path.join(NOTES_DIR, dir), cat, label));
  }

  // Also read top-level notes/*.md
  if (fs.existsSync(NOTES_DIR)) {
    try {
      for (const entry of fs.readdirSync(NOTES_DIR)) {
        if (!entry.endsWith('.md')) continue;
        const fullPath = path.join(NOTES_DIR, entry);
        try {
          const stat = fs.lstatSync(fullPath);
          if (!stat.isFile()) continue;
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const { data: frontmatter, content } = matter(raw);
          const wc = wordCount(content);
          const title = (frontmatter.title as string) || deriveTitle(raw, entry);
          docs.push({
            title, slug: `notes/${entry.replace(/\.md$/, '')}`, category: 'notes',
            categoryLabel: '📁 Notes', modified: stat.mtime.toISOString(),
            wordCount: wc, readingTime: Math.max(1, Math.round(wc / 200)),
            content, frontmatter,
          });
        } catch {}
      }
    } catch {}
  }

  // Journal entries from memory dir
  if (fs.existsSync(MEMORY_DIR)) {
    try {
      const entries = fs.readdirSync(MEMORY_DIR);
      for (const entry of entries) {
        if (!isJournalFile(entry)) continue;
        const fullPath = path.join(MEMORY_DIR, entry);
        try {
          const stat = fs.lstatSync(fullPath);
          if (!stat.isFile()) continue;
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const { data: frontmatter, content } = matter(raw);
          const wc = wordCount(content);
          const dateStr = entry.replace(/\.md$/, '');
          docs.push({
            title: dateStr,
            slug: `journal/${dateStr}`,
            category: 'journal',
            categoryLabel: '📅 Journal',
            modified: stat.mtime.toISOString(),
            wordCount: wc,
            readingTime: Math.max(1, Math.round(wc / 200)),
            content, frontmatter,
          });
        } catch {}
      }
    } catch {}
  }

  // MEMORY.md
  if (fs.existsSync(MEMORY_FILE)) {
    try {
      const stat = fs.lstatSync(MEMORY_FILE);
      const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
      const { data: frontmatter, content } = matter(raw);
      const wc = wordCount(content);
      docs.push({
        title: 'MEMORY',
        slug: 'memory/MEMORY',
        category: 'memory',
        categoryLabel: '🧠 Memory',
        modified: stat.mtime.toISOString(),
        wordCount: wc,
        readingTime: Math.max(1, Math.round(wc / 200)),
        content, frontmatter,
      });
    } catch {}
  }

  return docs;
}

export function getDocument(slug: string): DocFull | null {
  const all = getAllDocuments();
  return all.find(d => d.slug === slug) || null;
}

export function getDocMeta(doc: DocFull): DocMeta {
  const { content, frontmatter, ...meta } = doc;
  void content; void frontmatter;
  return meta;
}
