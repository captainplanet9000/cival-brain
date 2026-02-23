'use client';

import { useState, useRef, useEffect, useCallback, FormEvent, useMemo } from 'react';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  status: 'active' | 'paused';
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  lastMessagePreview: string;
  messageCount: number;
  model_preference?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: { model?: string };
  coalesced?: string[]; // For coalesced message parts
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Artifact {
  type: 'report' | 'table' | 'code' | 'chart' | 'checklist' | 'metrics' | 'shell' | 'browse';
  title: string;
  content: string;
  data?: any;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
}

interface GraphEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship: string;
}

const MODELS = [
  { id: 'auto', name: 'Auto (Smart Routing)' },
  { id: 'anthropic/claude-opus-4-6', name: 'Claude Opus 4' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
];

// ─── Rich Content Renderer with Shell/Browse Support ───
function RichContent({ content, onExecuteShell, onBrowseUrl }: { 
  content: string; 
  onExecuteShell?: (cmd: string) => void;
  onBrowseUrl?: (url: string) => void;
}) {
  const artifacts = useMemo(() => detectArtifacts(content, onExecuteShell, onBrowseUrl), [content]);
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<number>>(new Set());
  const [fullscreenArtifact, setFullscreenArtifact] = useState<number | null>(null);

  const toggleArtifact = (idx: number) => {
    const newSet = new Set(expandedArtifacts);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setExpandedArtifacts(newSet);
  };

  const copyArtifact = (artifact: Artifact) => {
    let text = artifact.content;
    if (artifact.type === 'table' && artifact.data) {
      text = artifact.data.map((row: string[]) => row.join(',')).join('\n');
    }
    navigator.clipboard.writeText(text);
  };

  let processedContent = content;
  const artifactMarkers: { idx: number; placeholder: string }[] = [];
  
  artifacts.forEach((art, idx) => {
    const placeholder = `__ARTIFACT_${idx}__`;
    artifactMarkers.push({ idx, placeholder });
    processedContent = processedContent.replace(art.content, placeholder);
  });

  const renderMarkdown = (text: string) => {
    // Code blocks (non-special)
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      if (lang === 'shell:execute' || lang === 'browse:url') return _; // Skip special blocks
      return `<pre class="code-block-pre"><div class="code-lang">${lang || 'text'}</div><code class="code-block">${escapeHtml(code)}</code></pre>`;
    });

    // Tables
    text = text.replace(/(\|.+\|[\r\n]+\|[-: |]+\|[\r\n]+((\|.+\|[\r\n]*)+))/gm, (match) => {
      const lines = match.trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) return match;
      
      const headers = lines[0].split('|').filter(c => c.trim()).map(h => h.trim());
      const rows = lines.slice(2).map(line => 
        line.split('|').filter(c => c.trim()).map(c => c.trim())
      );

      let table = '<table class="rich-table"><thead><tr>';
      headers.forEach(h => table += `<th>${h}</th>`);
      table += '</tr></thead><tbody>';
      rows.forEach(row => {
        table += '<tr>';
        row.forEach(cell => table += `<td>${cell}</td>`);
        table += '</tr>';
      });
      table += '</tbody></table>';
      return table;
    });

    // Headers
    text = text.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold, italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Lists
    text = text.replace(/^\* (.+)$/gm, '<li>$1</li>');
    text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
    text = text.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    text = text.replace(/(<li>[\s\S]*?<\/li>[\s]*)+/g, (match) => `<ul class="rich-list">${match}</ul>`);

    // Blockquotes
    text = text.replace(/^&gt; (.+)$/gm, '<blockquote class="rich-quote">$1</blockquote>');
    text = text.replace(/^> (.+)$/gm, '<blockquote class="rich-quote">$1</blockquote>');

    // HR
    text = text.replace(/^---$/gm, '<hr class="rich-hr" />');

    // Paragraphs
    text = text.replace(/\n\n/g, '</p><p>');
    text = `<p>${text}</p>`;
    text = text.replace(/<p><\/p>/g, '');

    return text;
  };

  const escapeHtml = (str: string) => {
    return str.replace(/[&<>"']/g, (char) => {
      const escape: any = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return escape[char];
    });
  };

  const parts = renderMarkdown(processedContent).split(/(__ARTIFACT_\d+__)/g);

  return (
    <div className="rich-content">
      {parts.map((part, idx) => {
        const marker = artifactMarkers.find(m => m.placeholder === part);
        if (marker) {
          const artifact = artifacts[marker.idx];
          const isExpanded = expandedArtifacts.has(marker.idx);
          const isFullscreen = fullscreenArtifact === marker.idx;

          return (
            <div key={idx} className={`artifact ${isFullscreen ? 'artifact-fullscreen' : ''}`}>
              <div className="artifact-header">
                <span className="artifact-icon">{getArtifactIcon(artifact.type)}</span>
                <span className="artifact-title">{artifact.title}</span>
                <div className="artifact-actions">
                  <button className="artifact-btn" onClick={() => copyArtifact(artifact)} title="Copy">
                    📋
                  </button>
                  <button className="artifact-btn" onClick={() => setFullscreenArtifact(isFullscreen ? null : marker.idx)} title="Fullscreen">
                    {isFullscreen ? '✕' : '⛶'}
                  </button>
                  <button className="artifact-btn" onClick={() => toggleArtifact(marker.idx)} title={isExpanded ? 'Collapse' : 'Expand'}>
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="artifact-body">
                  {renderArtifact(artifact)}
                </div>
              )}
            </div>
          );
        }
        return <div key={idx} dangerouslySetInnerHTML={{ __html: part }} />;
      })}

      {fullscreenArtifact !== null && (
        <div className="artifact-modal-overlay" onClick={() => setFullscreenArtifact(null)}>
          <div className="artifact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="artifact-modal-header">
              <span>{artifacts[fullscreenArtifact].title}</span>
              <button onClick={() => setFullscreenArtifact(null)}>✕</button>
            </div>
            <div className="artifact-modal-body">
              {renderArtifact(artifacts[fullscreenArtifact])}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getArtifactIcon(type: string): string {
  const icons: Record<string, string> = {
    report: '📊', table: '📋', code: '💻', chart: '📈',
    checklist: '✅', metrics: '🎯', shell: '⚡', browse: '🌐'
  };
  return icons[type] || '📄';
}

function renderArtifact(artifact: Artifact) {
  if (artifact.type === 'shell') {
    return (
      <div className="shell-output">
        <pre>{artifact.data?.output || 'Executing...'}</pre>
      </div>
    );
  }

  if (artifact.type === 'browse') {
    return (
      <div className="browse-content">
        <div className="browse-meta">
          <strong>{artifact.data?.title}</strong>
          <a href={artifact.data?.url} target="_blank" rel="noopener" style={{fontSize: '0.9rem', color: 'var(--blue)'}}>
            {artifact.data?.url}
          </a>
        </div>
        <div className="browse-text" style={{marginTop: '1rem', whiteSpace: 'pre-wrap'}}>
          {artifact.data?.content}
        </div>
      </div>
    );
  }

  // Other artifact types (table, chart, etc.) - same as before
  switch (artifact.type) {
    case 'table':
      if (!artifact.data) return null;
      return (
        <table className="artifact-table">
          <thead>
            <tr>{artifact.data[0].map((h: string, i: number) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {artifact.data.slice(1).map((row: string[], i: number) => (
              <tr key={i}>{row.map((cell: string, j: number) => <td key={j}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
    case 'code':
      return <pre className="artifact-code"><code>{artifact.data?.code || artifact.content}</code></pre>;
    case 'metrics':
      if (!artifact.data) return null;
      return (
        <div className="metric-cards">
          {artifact.data.map((metric: any, i: number) => (
            <div key={i} className="metric-card">
              <div className="metric-value">{metric.value}</div>
              <div className="metric-label">{metric.label}</div>
            </div>
          ))}
        </div>
      );
    case 'chart':
      if (!artifact.data) return null;
      const max = Math.max(...artifact.data.map((d: any) => d.value));
      return (
        <div className="bar-chart">
          {artifact.data.map((item: any, i: number) => (
            <div key={i} className="bar-row">
              <div className="bar-label">{item.label}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }}></div>
              </div>
              <div className="bar-value">{item.value}</div>
            </div>
          ))}
        </div>
      );
    default:
      return <div>{artifact.content}</div>;
  }
}

function detectArtifacts(content: string, onExecuteShell?: (cmd: string) => void, onBrowseUrl?: (url: string) => void): Artifact[] {
  const artifacts: Artifact[] = [];

  // Detect shell:execute blocks
  const shellPattern = /```shell:execute\n([\s\S]*?)```/g;
  let match;
  while ((match = shellPattern.exec(content)) !== null) {
    const command = match[1].trim();
    artifacts.push({
      type: 'shell',
      title: 'Shell Command',
      content: match[0],
      data: { 
        command,
        onExecute: () => onExecuteShell?.(command)
      }
    });
  }

  // Detect browse:url blocks
  const browsePattern = /```browse:url\n([\s\S]*?)```/g;
  while ((match = browsePattern.exec(content)) !== null) {
    const url = match[1].trim();
    artifacts.push({
      type: 'browse',
      title: 'Web Content',
      content: match[0],
      data: { 
        url,
        onBrowse: () => onBrowseUrl?.(url)
      }
    });
  }

  // Other artifact detection (tables, etc.) - same as before
  const tablePattern = /(\|.+\|[\r\n]+\|[-: |]+\|[\r\n]+((\|.+\|[\r\n]*)+))/gm;
  while ((match = tablePattern.exec(content)) !== null) {
    const lines = match[0].trim().split('\n').filter(l => l.trim());
    if (lines.length >= 3) {
      const headers = lines[0].split('|').filter(c => c.trim()).map(h => h.trim());
      const data = [headers, ...lines.slice(2).map(line => 
        line.split('|').filter(c => c.trim()).map(c => c.trim())
      )];
      artifacts.push({ type: 'table', title: 'Data Table', content: match[0], data });
    }
  }

  return artifacts;
}

// ─── Memory Graph Component ───
function MemoryGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Simple force-directed layout
    const nodeMap = new Map(nodes.map(n => [n.id, { ...n, x: n.x || Math.random() * width, y: n.y || Math.random() * height, vx: 0, vy: 0 }]));

    const simulate = () => {
      // Apply forces
      nodeMap.forEach((node, id) => {
        let fx = 0, fy = 0;

        // Repulsion from other nodes
        nodeMap.forEach((other) => {
          if (other.id === id) return;
          const dx = node.x! - other.x!;
          const dy = node.y! - other.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });

        // Attraction from edges
        edges.forEach(edge => {
          if (edge.source_node_id === id) {
            const target = nodeMap.get(edge.target_node_id);
            if (target) {
              const dx = target.x! - node.x!;
              const dy = target.y! - node.y!;
              fx += dx * 0.01;
              fy += dy * 0.01;
            }
          }
        });

        // Center gravity
        fx += (width / 2 - node.x!) * 0.001;
        fy += (height / 2 - node.y!) * 0.001;

        node.vx = (node.vx! + fx) * 0.8;
        node.vy = (node.vy! + fy) * 0.8;
        node.x = Math.max(30, Math.min(width - 30, node.x! + node.vx!));
        node.y = Math.max(30, Math.min(height - 30, node.y! + node.vy!));
      });

      // Draw
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      edges.forEach(edge => {
        const source = nodeMap.get(edge.source_node_id);
        const target = nodeMap.get(edge.target_node_id);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x!, source.y!);
          ctx.lineTo(target.x!, target.y!);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodeMap.forEach(node => {
        ctx.fillStyle = node.id === hoveredNode ? '#60a5fa' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        ctx.fillText(node.label.substring(0, 15), node.x! + 12, node.y! + 4);
      });
    };

    const interval = setInterval(simulate, 50);
    return () => clearInterval(interval);
  }, [nodes, edges, hoveredNode]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      style={{ width: '100%', height: '300px', background: '#0a0a0a', borderRadius: '8px' }}
    />
  );
}

// ─── Main Chat Component ───
export default function ChatPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [showMemoryGraph, setShowMemoryGraph] = useState(false);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [councilMode, setCouncilMode] = useState(false);
  const [mentionedAgents, setMentionedAgents] = useState<Agent[]>([]);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  
  // Message coalescing
  const [coalescedParts, setCoalescedParts] = useState<string[]>([]);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const coalescingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    loadAgents();
    checkGatewayStatus();
    loadMemoryGraph();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadConversations(selectedAgent.id);
    }
  }, [selectedAgent]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      setSelectedModel(selectedConversation.model_preference || 'auto');
    }
  }, [selectedConversation]);

  // Auto-grow textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Message coalescing logic
  useEffect(() => {
    if (coalescedParts.length > 0) {
      // Show "typing more..." indicator
      const now = Date.now();
      if (now - lastMessageTime > 30000) {
        // More than 30s since last message, flush immediately
        flushCoalescedMessage();
      } else {
        // Start 3-second timer
        if (coalescingTimerRef.current) clearTimeout(coalescingTimerRef.current);
        coalescingTimerRef.current = setTimeout(flushCoalescedMessage, 3000);
      }
    }
  }, [coalescedParts, lastMessageTime]);

  const flushCoalescedMessage = () => {
    if (coalescedParts.length === 0) return;
    const fullMessage = coalescedParts.join('\n\n---\n\n');
    setCoalescedParts([]);
    sendMessageToLLM(fullMessage);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const checkGatewayStatus = async () => {
    try {
      const res = await fetch('/api/openclaw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      });
      const data = await res.json();
      setGatewayStatus(data.status === 'online' ? 'online' : 'offline');
    } catch {
      setGatewayStatus('offline');
    }
  };

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/brain-agents');
      const data = await res.json();
      if (data.success && data.agents.length > 0) {
        setAgents(data.agents);
        setSelectedAgent(data.agents[0]);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadConversations = async (agentId: string) => {
    try {
      const res = await fetch(`/api/brain-agents/${agentId}/conversations`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
        if (data.conversations.length > 0) {
          setSelectedConversation(data.conversations[0]);
        } else {
          setSelectedConversation(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/brain-agents/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadMemoryGraph = async () => {
    try {
      const res = await fetch('/api/brain-memories/graph');
      const data = await res.json();
      if (data.success) {
        setGraphNodes(data.nodes || []);
        setGraphEdges(data.edges || []);
      }
    } catch (error) {
      console.error('Failed to load memory graph:', error);
    }
  };

  const createNewConversation = async () => {
    if (!selectedAgent) return;

    try {
      const res = await fetch(`/api/brain-agents/${selectedAgent.id}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat', model_preference: selectedModel }),
      });
      const data = await res.json();
      if (data.success) {
        await loadConversations(selectedAgent.id);
        setSelectedConversation(data.conversation);
        setMessages([]);
        showToast('New conversation created');
      }
    } catch (error) {
      showToast('Failed to create conversation', 'error');
    }
  };

  const executeShellCommand = async (command: string) => {
    if (!confirm(`Execute command?\n\n${command}`)) return;

    showToast('Executing...', 'info');
    try {
      const res = await fetch('/api/brain-agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('Command executed');
        // You could add the output to messages here
        const output = `$ ${command}\n\n${data.stdout}${data.stderr ? '\n' + data.stderr : ''}`;
        const msg: Message = {
          id: `shell-${Date.now()}`,
          role: 'system',
          content: `\`\`\`\n${output}\n\`\`\``,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, msg]);
      } else {
        showToast(data.blocked ? 'Command blocked for security' : 'Execution failed', 'error');
      }
    } catch (error) {
      showToast('Execution error', 'error');
    }
  };

  const browseUrl = async (url: string) => {
    showToast('Fetching...', 'info');
    try {
      const res = await fetch('/api/brain-agents/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('Content fetched');
        const msg: Message = {
          id: `browse-${Date.now()}`,
          role: 'system',
          content: `**${data.title}**\n\n${data.content}`,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, msg]);
      } else {
        showToast('Failed to fetch URL', 'error');
      }
    } catch (error) {
      showToast('Browse error', 'error');
    }
  };

  const sendMessageToLLM = async (messageText: string) => {
    if (!selectedAgent || !selectedConversation) return;

    setLoading(true);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
      coalesced: coalescedParts.length > 1 ? coalescedParts : undefined,
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // If council mode or multiple agents mentioned, send to all
      const targetAgents = councilMode ? agents : 
        mentionedAgents.length > 0 ? mentionedAgents : [selectedAgent];

      if (targetAgents.length > 1) {
        // Multi-agent mode
        const responses = await Promise.all(
          targetAgents.map(agent =>
            fetch(`/api/brain-agents/${agent.id}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationId: selectedConversation.id,
                message: messageText,
                model: selectedModel !== 'auto' ? selectedModel : undefined,
              }),
            }).then(r => r.json()).then(d => ({ agent, data: d }))
          )
        );

        // Add all responses
        responses.forEach(({ agent, data }) => {
          if (data.success) {
            const msg: Message = {
              id: `${agent.id}-${Date.now()}`,
              role: 'assistant',
              content: `**${agent.emoji} ${agent.name}:**\n\n${data.response}`,
              created_at: new Date().toISOString(),
              metadata: { model: data.model },
            };
            setMessages(prev => [...prev, msg]);
          }
        });

        if (responses[0]?.data?.memoriesCount) {
          setMemoryCount(responses[0].data.memoriesCount);
        }
      } else {
        // Single agent
        const res = await fetch(`/api/brain-agents/${selectedAgent.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            message: messageText,
            model: selectedModel !== 'auto' ? selectedModel : undefined,
          }),
        });
        const data = await res.json();

        if (data.success) {
          await loadMessages(selectedConversation.id);
          await loadConversations(selectedAgent.id);
          if (data.memoriesCount) setMemoryCount(data.memoriesCount);
        } else {
          const errorMsg: Message = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Error: ${data.error || 'Failed to send message'}`,
            created_at: new Date().toISOString(),
          };
          setMessages(prev => [...prev.slice(0, -1), errorMsg]);
        }
      }

      // Refresh memory graph
      loadMemoryGraph();
    } catch (error) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev.slice(0, -1), errorMsg]);
    } finally {
      setLoading(false);
      setMentionedAgents([]);
      inputRef.current?.focus();
    }
  };

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    const now = Date.now();

    // Check if we should coalesce
    if (now - lastMessageTime < 30000 && coalescedParts.length > 0) {
      // Within 30s window, add to coalesced parts
      setCoalescedParts(prev => [...prev, text]);
      setLastMessageTime(now);
    } else {
      // Start new message or send immediately
      if (coalescedParts.length > 0) {
        flushCoalescedMessage();
      }
      
      // Check for rapid succession
      if (text.length < 100) {
        setCoalescedParts([text]);
        setLastMessageTime(now);
      } else {
        sendMessageToLLM(text);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (coalescedParts.length > 0) {
        flushCoalescedMessage();
      } else {
        sendMessage();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Check for @mentions
    const lastWord = value.split(/\s/).pop() || '';
    if (lastWord.startsWith('@')) {
      setShowAgentPicker(true);
    } else {
      setShowAgentPicker(false);
    }
  };

  const mentionAgent = (agent: Agent) => {
    const words = input.split(/\s/);
    words[words.length - 1] = `@${agent.name}`;
    setInput(words.join(' ') + ' ');
    setShowAgentPicker(false);
    if (!mentionedAgents.find(a => a.id === agent.id)) {
      setMentionedAgents(prev => [...prev, agent]);
    }
    inputRef.current?.focus();
  };

  const getRelativeTime = (date: string) => {
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="chat-page-container">
      {/* Left Sidebar - Agents */}
      <div className="chat-agents-panel">
        <div className="chat-panel-header">
          <span style={{ fontSize: '1.1rem' }}>🧠</span>
          <h2>Specialist Agents</h2>
        </div>
        <div className="chat-agents-list">
          {agents.map(agent => (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`chat-agent-card ${selectedAgent?.id === agent.id ? 'active' : ''}`}
              style={{
                borderColor: selectedAgent?.id === agent.id ? agent.color : undefined
              }}
            >
              <div className="chat-agent-top">
                <span className="chat-agent-emoji">{agent.emoji}</span>
                <div className="chat-agent-info">
                  <div className="chat-agent-name">{agent.name}</div>
                </div>
              </div>
              <div className="chat-agent-desc">{agent.description}</div>
            </div>
          ))}
        </div>
        
        {/* Council Mode Toggle */}
        <div style={{ padding: '1rem', borderTop: '1px solid #333' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={councilMode}
              onChange={(e) => setCouncilMode(e.target.checked)}
            />
            <span>Council Mode (all agents)</span>
          </label>
        </div>

        <div className="chat-gateway-status">
          <span className="gateway-dot" style={{
            background: gatewayStatus === 'online' ? 'var(--green)' : gatewayStatus === 'checking' ? 'var(--amber)' : 'var(--rose)'
          }}></span>
          <span className="gateway-text">
            {gatewayStatus === 'checking' ? 'Connecting...' : gatewayStatus === 'online' ? 'Live data' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Center Panel - Conversations */}
      <div className="chat-convs-panel">
        <div className="chat-panel-header">
          <div className="convs-header-top">
            <span className="convs-label">Conversations</span>
            <button
              className="btn-new-conv"
              onClick={createNewConversation}
              disabled={!selectedAgent}
            >
              + New
            </button>
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="conv-search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="chat-convs-list">
          {conversations.filter(c =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
          ).map(conv => (
            <div
              key={conv.id}
              className={`conv-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
              onClick={() => setSelectedConversation(conv)}
            >
              <div className="conv-item-main">
                <div className="conv-title">{conv.title}</div>
                <div className="conv-preview">{conv.lastMessagePreview || 'No messages'}</div>
                <div className="conv-meta">
                  <span>{getRelativeTime(conv.updated_at)}</span>
                  <span>·</span>
                  <span>{conv.messageCount} msgs</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="chat-main-panel">
        {selectedAgent && selectedConversation && (
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="chat-header-emoji">{selectedAgent.emoji}</span>
              <div className="chat-header-info">
                <div className="chat-header-title">{selectedConversation.title}</div>
                <div className="chat-header-subtitle">
                  {selectedAgent.name}
                  {memoryCount > 0 && (
                    <span className="context-badge" style={{marginLeft: '0.5rem'}}>
                      🧠 {memoryCount} memories
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="chat-header-actions">
              {/* Model Selector */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button 
                className="chat-header-btn" 
                onClick={() => setShowMemoryGraph(!showMemoryGraph)}
                title="Memory Graph"
              >
                🕸️
              </button>
            </div>
          </div>
        )}

        {/* Memory Graph Sidebar */}
        {showMemoryGraph && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '60px',
            width: '400px',
            height: 'calc(100% - 60px)',
            background: '#111',
            borderLeft: '1px solid #333',
            padding: '1rem',
            overflowY: 'auto',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Memory Graph</h3>
              <button onClick={() => setShowMemoryGraph(false)}>✕</button>
            </div>
            {graphNodes.length > 0 ? (
              <MemoryGraph nodes={graphNodes} edges={graphEdges} />
            ) : (
              <p style={{color: '#888'}}>No memory nodes yet</p>
            )}
            <div style={{marginTop: '1rem', fontSize: '0.9rem', color: '#888'}}>
              {graphNodes.length} nodes, {graphEdges.length} edges
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages-area">
          {selectedConversation ? (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
                  <div className="msg-avatar">
                    {msg.role === 'user' ? '👤' : msg.role === 'system' ? '⚙️' : selectedAgent?.emoji}
                  </div>
                  <div className="msg-body">
                    {msg.coalesced && msg.coalesced.length > 1 && (
                      <div style={{fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem'}}>
                        [Coalesced {msg.coalesced.length} messages]
                      </div>
                    )}
                    <RichContent 
                      content={msg.content}
                      onExecuteShell={executeShellCommand}
                      onBrowseUrl={browseUrl}
                    />
                    <div className="msg-meta">
                      <span className="msg-time">{getRelativeTime(msg.created_at)}</span>
                      {msg.metadata?.model && (
                        <span style={{marginLeft: '0.5rem', color: '#888', fontSize: '0.85rem'}}>
                          {MODELS.find(m => m.id === msg.metadata?.model)?.name || msg.metadata.model}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="chat-message chat-message-assistant">
                  <div className="msg-avatar">{selectedAgent?.emoji}</div>
                  <div className="msg-body">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}

              {coalescedParts.length > 0 && !loading && (
                <div style={{padding: '0.5rem 1rem', background: '#1a1a1a', borderRadius: '8px', margin: '0.5rem', color: '#888', fontSize: '0.9rem'}}>
                  ✍️ Typing more... (press Enter to send)
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="chat-welcome">
              {selectedAgent && (
                <>
                  <span className="welcome-emoji">{selectedAgent.emoji}</span>
                  <h2 className="welcome-title">{selectedAgent.name}</h2>
                  <p className="welcome-desc">{selectedAgent.description}</p>
                  <button className="welcome-cta" onClick={createNewConversation}>
                    Start a conversation
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        {selectedConversation && (
          <div className="chat-input-container">
            {showAgentPicker && (
              <div className="slash-menu">
                {agents.filter(a => a.name.toLowerCase().includes(input.split('@').pop()?.toLowerCase() || '')).map(agent => (
                  <div
                    key={agent.id}
                    className="slash-menu-item"
                    onClick={() => mentionAgent(agent)}
                  >
                    <span>{agent.emoji} {agent.name}</span>
                  </div>
                ))}
              </div>
            )}
            {mentionedAgents.length > 0 && (
              <div style={{padding: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                {mentionedAgents.map(agent => (
                  <span key={agent.id} style={{padding: '0.25rem 0.5rem', background: '#1a1a1a', borderRadius: '4px', fontSize: '0.9rem'}}>
                    {agent.emoji} {agent.name}
                    <button onClick={() => setMentionedAgents(prev => prev.filter(a => a.id !== agent.id))} style={{marginLeft: '0.5rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer'}}>×</button>
                  </span>
                ))}
              </div>
            )}
            <form className="chat-input-bar" onSubmit={sendMessage}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${selectedAgent?.name}... (type @ to mention agents)`}
                disabled={loading}
                className="chat-input"
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!input.trim() || loading}
                style={{ background: selectedAgent?.color }}
              >
                ➤
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
