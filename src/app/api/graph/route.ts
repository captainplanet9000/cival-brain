import { NextResponse } from 'next/server';
import { getAllDocuments, DocFull } from '@/lib/documents';

export const dynamic = 'force-dynamic';

interface GraphNode {
  id: string;
  label: string;
  category: string;
  wordCount: number;
  connections: number;
  slug: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'tag' | 'link' | 'folder' | 'project';
  weight: number;
}

function extractTags(doc: DocFull): string[] {
  const tags: string[] = [];
  // From frontmatter
  if (doc.frontmatter.tags) {
    const ft = doc.frontmatter.tags;
    if (Array.isArray(ft)) tags.push(...ft.map(String));
    else if (typeof ft === 'string') tags.push(...ft.split(',').map(s => s.trim()));
  }
  // Extract hashtags from content
  const hashTags = doc.content.match(/#([a-zA-Z][\w-]{2,})/g);
  if (hashTags) tags.push(...hashTags.map(t => t.slice(1).toLowerCase()));
  return [...new Set(tags.map(t => t.toLowerCase()))];
}

function extractLinks(doc: DocFull): string[] {
  const links: string[] = [];
  // Wiki links [[...]]
  const wikiLinks = doc.content.match(/\[\[([^\]]+)\]\]/g);
  if (wikiLinks) links.push(...wikiLinks.map(l => l.slice(2, -2).toLowerCase().trim()));
  // Markdown links to .md files
  const mdLinks = doc.content.match(/\[([^\]]*)\]\(([^)]+\.md)\)/g);
  if (mdLinks) {
    for (const ml of mdLinks) {
      const m = ml.match(/\]\(([^)]+)\)/);
      if (m) links.push(m[1].replace(/\.md$/, '').split('/').pop()!.toLowerCase());
    }
  }
  return [...new Set(links)];
}

function extractProjectRefs(doc: DocFull): string[] {
  const refs: string[] = [];
  const projectNames = ['agent-trading-farm', 'cival-systems', 'flash-loan', 'wallet-banking', 'arbitrage'];
  const contentLower = doc.content.toLowerCase();
  for (const name of projectNames) {
    if (contentLower.includes(name)) refs.push(name);
  }
  return refs;
}

export async function GET() {
  try {
    const docs = getAllDocuments();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const edgeSet = new Set<string>();

    const addEdge = (source: string, target: string, type: GraphEdge['type'], weight: number) => {
      if (source === target) return;
      const key = [source, target].sort().join('::') + '::' + type;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      edges.push({ source, target, type, weight });
    };

    // Build node data
    const docTags = new Map<string, string[]>();
    const docLinks = new Map<string, string[]>();
    const docProjects = new Map<string, string[]>();
    const docFolders = new Map<string, string>();

    for (const doc of docs) {
      docTags.set(doc.slug, extractTags(doc));
      docLinks.set(doc.slug, extractLinks(doc));
      docProjects.set(doc.slug, extractProjectRefs(doc));
      docFolders.set(doc.slug, doc.slug.split('/')[0]);
    }

    // Tag-based edges
    const tagIndex = new Map<string, string[]>();
    for (const [slug, tags] of docTags) {
      for (const tag of tags) {
        if (!tagIndex.has(tag)) tagIndex.set(tag, []);
        tagIndex.get(tag)!.push(slug);
      }
    }
    for (const [, slugs] of tagIndex) {
      if (slugs.length < 2) continue;
      for (let i = 0; i < slugs.length; i++) {
        for (let j = i + 1; j < slugs.length; j++) {
          addEdge(slugs[i], slugs[j], 'tag', 2);
        }
      }
    }

    // Link-based edges
    for (const [slug, links] of docLinks) {
      for (const link of links) {
        const target = docs.find(d =>
          d.slug.toLowerCase().includes(link) ||
          d.title.toLowerCase() === link
        );
        if (target) addEdge(slug, target.slug, 'link', 3);
      }
    }

    // Folder-based edges (weak)
    const folderIndex = new Map<string, string[]>();
    for (const [slug, folder] of docFolders) {
      if (!folderIndex.has(folder)) folderIndex.set(folder, []);
      folderIndex.get(folder)!.push(slug);
    }
    for (const [, slugs] of folderIndex) {
      if (slugs.length < 2) continue;
      for (let i = 0; i < slugs.length && i < 20; i++) {
        for (let j = i + 1; j < slugs.length && j < 20; j++) {
          addEdge(slugs[i], slugs[j], 'folder', 1);
        }
      }
    }

    // Project-based edges (strong)
    const projIndex = new Map<string, string[]>();
    for (const [slug, projs] of docProjects) {
      for (const p of projs) {
        if (!projIndex.has(p)) projIndex.set(p, []);
        projIndex.get(p)!.push(slug);
      }
    }
    for (const [, slugs] of projIndex) {
      if (slugs.length < 2) continue;
      for (let i = 0; i < slugs.length; i++) {
        for (let j = i + 1; j < slugs.length; j++) {
          addEdge(slugs[i], slugs[j], 'project', 4);
        }
      }
    }

    // Count connections per node
    const connCount = new Map<string, number>();
    for (const e of edges) {
      connCount.set(e.source, (connCount.get(e.source) || 0) + 1);
      connCount.set(e.target, (connCount.get(e.target) || 0) + 1);
    }

    for (const doc of docs) {
      nodes.push({
        id: doc.slug,
        label: doc.title,
        category: doc.category,
        wordCount: doc.wordCount,
        connections: connCount.get(doc.slug) || 0,
        slug: doc.slug,
      });
    }

    return NextResponse.json({ nodes, edges });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to build graph', detail: String(err) }, { status: 500 });
  }
}
