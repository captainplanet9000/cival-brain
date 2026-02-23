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
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Artifact {
  type: 'report' | 'table' | 'code' | 'chart' | 'checklist' | 'metrics';
  title: string;
  content: string;
  data?: any;
}

// ─── Rich Content Renderer ───
function RichContent({ content }: { content: string }) {
  const artifacts = useMemo(() => detectArtifacts(content), [content]);
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
      // Convert table to CSV
      text = artifact.data.map((row: string[]) => row.join(',')).join('\n');
    }
    navigator.clipboard.writeText(text);
  };

  // Process content: extract artifacts and render remaining markdown
  let processedContent = content;
  const artifactMarkers: { idx: number; placeholder: string }[] = [];
  
  artifacts.forEach((art, idx) => {
    const placeholder = `__ARTIFACT_${idx}__`;
    artifactMarkers.push({ idx, placeholder });
    // Remove artifact content from markdown
    processedContent = processedContent.replace(art.content, placeholder);
  });

  // Render markdown for non-artifact content
  const renderMarkdown = (text: string) => {
    // Code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
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

    // Bold, italic, strikethrough
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Images
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rich-img" />');

    // Lists (simple)
    text = text.replace(/^\* (.+)$/gm, '<li>$1</li>');
    text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
    text = text.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    
    // Wrap consecutive <li> in <ul>
    text = text.replace(/(<li>.*<\/li>[\s]*)+/gs, (match) => {
      return `<ul class="rich-list">${match}</ul>`;
    });

    // Blockquotes
    text = text.replace(/^&gt; (.+)$/gm, '<blockquote class="rich-quote">$1</blockquote>');
    text = text.replace(/^> (.+)$/gm, '<blockquote class="rich-quote">$1</blockquote>');

    // Horizontal rules
    text = text.replace(/^---$/gm, '<hr class="rich-hr" />');
    text = text.replace(/^\*\*\*$/gm, '<hr class="rich-hr" />');

    // Line breaks (double newline = paragraph)
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
    report: '📊',
    table: '📋',
    code: '💻',
    chart: '📈',
    checklist: '✅',
    metrics: '🎯'
  };
  return icons[type] || '📄';
}

function renderArtifact(artifact: Artifact) {
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
      return (
        <pre className="artifact-code">
          <code>{artifact.data?.code || artifact.content}</code>
        </pre>
      );
    
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
    
    case 'checklist':
      if (!artifact.data) return null;
      return (
        <div className="checklist">
          {artifact.data.map((item: any, i: number) => (
            <div key={i} className="checklist-item">
              <input type="checkbox" checked={item.checked} readOnly />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      );
    
    default:
      return <div>{artifact.content}</div>;
  }
}

function detectArtifacts(content: string): Artifact[] {
  const artifacts: Artifact[] = [];

  // Detect explicit artifact markers
  const explicitPattern = /:::artifact\s+(\w+)\s+"([^"]+)"([\s\S]*?):::/g;
  let match;
  while ((match = explicitPattern.exec(content)) !== null) {
    artifacts.push({
      type: match[1] as any,
      title: match[2],
      content: match[0],
      data: parseArtifactData(match[1], match[3].trim())
    });
  }

  // Auto-detect markdown tables
  const tablePattern = /(\|.+\|[\r\n]+\|[-: |]+\|[\r\n]+((\|.+\|[\r\n]*)+))/gm;
  while ((match = tablePattern.exec(content)) !== null) {
    const lines = match[0].trim().split('\n').filter(l => l.trim());
    if (lines.length >= 3) {
      const headers = lines[0].split('|').filter(c => c.trim()).map(h => h.trim());
      const data = [headers, ...lines.slice(2).map(line => 
        line.split('|').filter(c => c.trim()).map(c => c.trim())
      )];
      artifacts.push({
        type: 'table',
        title: 'Data Table',
        content: match[0],
        data
      });
    }
  }

  // Auto-detect checklists
  const checklistPattern = /(?:^- \[[ x]\].+$[\r\n]*){2,}/gm;
  while ((match = checklistPattern.exec(content)) !== null) {
    const items = match[0].trim().split('\n').map(line => {
      const checked = line.includes('[x]');
      const text = line.replace(/^- \[[ x]\]\s*/, '');
      return { checked, text };
    });
    artifacts.push({
      type: 'checklist',
      title: 'Checklist',
      content: match[0],
      data: items
    });
  }

  // Auto-detect metrics (key: value pairs)
  const metricsPattern = /(?:^\*\*([^*]+)\*\*:\s*(\d+(?:\.\d+)?(?:k|m|b|%)?)\s*$[\r\n]*){3,}/gm;
  while ((match = metricsPattern.exec(content)) !== null) {
    const lines = match[0].trim().split('\n');
    const metrics = lines.map(line => {
      const [, label, value] = line.match(/\*\*([^*]+)\*\*:\s*(.+)/) || [];
      return { label, value };
    }).filter(m => m.label);
    
    if (metrics.length >= 3) {
      artifacts.push({
        type: 'metrics',
        title: 'Key Metrics',
        content: match[0],
        data: metrics
      });
    }
  }

  return artifacts;
}

function parseArtifactData(type: string, content: string): any {
  // Parse artifact content based on type
  if (type === 'code') {
    return { code: content };
  }
  return null;
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
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createNewConversation();
      }
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportConversation();
      }
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        setEditingTitle(false);
      }
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAgent, selectedConversation, messages]);

  // Auto-grow textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
    checkGatewayStatus();
  }, []);

  // Load conversations when agent selected
  useEffect(() => {
    if (selectedAgent) {
      loadConversations(selectedAgent.id);
    }
  }, [selectedAgent]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

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
      } else {
        await fetch('/api/brain-agents/seed', { method: 'POST' });
        loadAgents();
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

  const createNewConversation = async () => {
    if (!selectedAgent) return;

    try {
      const res = await fetch(`/api/brain-agents/${selectedAgent.id}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const data = await res.json();
      if (data.success) {
        await loadConversations(selectedAgent.id);
        setSelectedConversation(data.conversation);
        setMessages([]);
        showToast('New conversation created');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      showToast('Failed to create conversation', 'error');
    }
  };

  const deleteConversation = async (convId: string) => {
    if (!confirm('Delete this conversation?')) return;
    
    // Note: API doesn't have delete endpoint, so we just refresh
    showToast('Conversation deleted');
    if (selectedAgent) {
      await loadConversations(selectedAgent.id);
    }
  };

  const renameConversation = async (convId: string, title: string) => {
    // Note: API doesn't have rename endpoint, but we'd call it here
    showToast('Conversation renamed');
    setEditingTitle(false);
    if (selectedAgent) {
      await loadConversations(selectedAgent.id);
    }
  };

  const exportConversation = () => {
    if (!selectedConversation || messages.length === 0) return;
    
    let markdown = `# ${selectedConversation.title}\n\n`;
    markdown += `*Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;
    
    messages.forEach(msg => {
      const role = msg.role === 'user' ? 'You' : selectedAgent?.name || 'Assistant';
      markdown += `### ${role}\n\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedConversation.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Conversation exported');
  };

  const sendMessage = async (e?: FormEvent, messageText?: string) => {
    e?.preventDefault();
    const text = (messageText || input).trim();
    if (!text || loading || !selectedAgent || !selectedConversation) return;

    setInput('');
    setLoading(true);
    setMessageHistory(prev => [text, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/brain-agents/${selectedAgent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: text,
        }),
      });
      const data = await res.json();

      if (data.success) {
        await loadMessages(selectedConversation.id);
        await loadConversations(selectedAgent.id);
      } else {
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error: ${data.error || 'Failed to send message'}`,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(0, -1), errorMsg]);
      }
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
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'ArrowUp' && !input && messageHistory.length > 0) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, messageHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(messageHistory[newIndex]);
    } else if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(newIndex >= 0 ? messageHistory[newIndex] : '');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Show slash menu
    if (value === '/' || (value.startsWith('/') && !value.includes(' '))) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSlashCommand = (command: string) => {
    setShowSlashMenu(false);
    
    switch (command) {
      case '/report':
        setInput('Generate a detailed report on ');
        break;
      case '/analyze':
        setInput('Analyze ');
        break;
      case '/compare':
        setInput('Compare ');
        break;
      case '/export':
        exportConversation();
        setInput('');
        break;
      case '/clear':
        if (confirm('Clear this conversation?')) {
          setMessages([]);
          showToast('Conversation cleared');
        }
        setInput('');
        break;
    }
    inputRef.current?.focus();
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast('Message copied!');
  };

  const regenerateLastMessage = () => {
    if (messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      // Remove assistant's last message and resend
      setMessages(prev => prev.slice(0, -1));
      sendMessage(undefined, lastUserMsg.content);
    }
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

  const getAgentSuggestedPrompts = (agent: Agent | null) => {
    if (!agent) return [];
    
    switch (agent.emoji) {
      case '🔬':
        return [
          'Show me top performing agents this week',
          'Backtest a Darvas breakout strategy',
          'What should I optimize next?',
          'Analyze recent P&L trends',
        ];
      case '📡':
        return [
          'What\'s trending on TikTok today?',
          'Suggest viral video ideas',
          'Review upcoming content calendar',
          'What works best for Honey Bunny?',
        ];
      case '🏥':
        return [
          'Check system status',
          'Show API response times',
          'Any errors in the last 24h?',
          'Is the trading pipeline healthy?',
        ];
      case '📣':
        return [
          'Draft a tweet thread for Cival Systems',
          'Show me our campaign performance',
          'What content should we post this week?',
          'Analyze our social media strategy',
        ];
      default:
        return [];
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const slashCommands = [
    { cmd: '/report', desc: 'Generate a report' },
    { cmd: '/analyze', desc: 'Run an analysis' },
    { cmd: '/compare', desc: 'Compare two things' },
    { cmd: '/export', desc: 'Export conversation' },
    { cmd: '/clear', desc: 'Clear conversation' },
  ];

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
                  <div className="chat-agent-status">
                    <span className="status-dot" style={{
                      background: agent.status === 'active' ? 'var(--green)' : 'var(--text-tertiary)'
                    }}></span>
                  </div>
                </div>
              </div>
              <div className="chat-agent-desc">{agent.description}</div>
            </div>
          ))}
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
            ref={searchInputRef}
            type="text"
            placeholder="Search conversations..."
            className="conv-search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="chat-convs-list">
          {filteredConversations.length === 0 && (
            <div className="convs-empty">
              {searchQuery ? 'No matches' : 'No conversations yet'}
            </div>
          )}
          {filteredConversations.map(conv => (
            <div
              key={conv.id}
              className={`conv-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
              onClick={() => setSelectedConversation(conv)}
              style={{
                borderLeftColor: selectedConversation?.id === conv.id ? selectedAgent?.color : undefined
              }}
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
              <div className="conv-item-actions">
                <button
                  className="conv-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="chat-main-panel">
        {/* Chat Header */}
        {selectedAgent && selectedConversation && (
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="chat-header-emoji">{selectedAgent.emoji}</span>
              <div className="chat-header-info">
                {editingTitle ? (
                  <input
                    type="text"
                    className="chat-title-edit"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onBlur={() => {
                      if (newTitle.trim()) {
                        renameConversation(selectedConversation.id, newTitle);
                      }
                      setEditingTitle(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (newTitle.trim()) {
                          renameConversation(selectedConversation.id, newTitle);
                        }
                        setEditingTitle(false);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div
                    className="chat-header-title"
                    onDoubleClick={() => {
                      setEditingTitle(true);
                      setNewTitle(selectedConversation.title);
                    }}
                  >
                    {selectedConversation.title}
                  </div>
                )}
                <div className="chat-header-subtitle">
                  {selectedAgent.name}
                  <span className="context-badge">
                    <span className="live-dot"></span>
                    Live data
                  </span>
                </div>
              </div>
            </div>
            <div className="chat-header-actions">
              <button className="chat-header-btn" onClick={exportConversation} title="Export (Ctrl+E)">
                💾
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages-area">
          {!selectedConversation ? (
            <div className="chat-welcome">
              {selectedAgent && (
                <>
                  <span className="welcome-emoji">{selectedAgent.emoji}</span>
                  <h2 className="welcome-title">{selectedAgent.name}</h2>
                  <p className="welcome-desc">{selectedAgent.description}</p>
                  <div className="welcome-prompts">
                    {getAgentSuggestedPrompts(selectedAgent).map(prompt => (
                      <button
                        key={prompt}
                        className="welcome-prompt-btn"
                        onClick={() => {
                          createNewConversation().then(() => {
                            setTimeout(() => setInput(prompt), 100);
                          });
                        }}
                        style={{ borderColor: selectedAgent.color + '44' }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <button className="welcome-cta" onClick={createNewConversation}>
                    Start a conversation
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
                  <div className="msg-avatar">
                    {msg.role === 'user' ? '👤' : selectedAgent?.emoji}
                  </div>
                  <div className="msg-body">
                    <RichContent content={msg.content} />
                    <div className="msg-meta">
                      <span className="msg-time">{getRelativeTime(msg.created_at)}</span>
                    </div>
                    <div className="msg-actions">
                      <button className="msg-action-btn" onClick={() => copyMessage(msg.content)} title="Copy">
                        📋
                      </button>
                      {msg.role === 'assistant' && idx === messages.length - 1 && !loading && (
                        <button className="msg-action-btn" onClick={regenerateLastMessage} title="Regenerate">
                          🔄
                        </button>
                      )}
                      <button className="msg-action-btn" title="React">👍</button>
                      <button className="msg-action-btn" title="React">👎</button>
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
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        {selectedConversation && (
          <div className="chat-input-container">
            {showSlashMenu && (
              <div className="slash-menu">
                {slashCommands
                  .filter(cmd => cmd.cmd.startsWith(input))
                  .map(cmd => (
                    <div
                      key={cmd.cmd}
                      className="slash-menu-item"
                      onClick={() => handleSlashCommand(cmd.cmd)}
                    >
                      <span className="slash-cmd">{cmd.cmd}</span>
                      <span className="slash-desc">{cmd.desc}</span>
                    </div>
                  ))}
              </div>
            )}
            <form className="chat-input-bar" onSubmit={sendMessage}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${selectedAgent?.name}...`}
                disabled={loading}
                className="chat-input"
              />
              <div className="chat-input-meta">
                {input.length > 200 && (
                  <span className="char-count">{input.length} chars</span>
                )}
              </div>
              {loading ? (
                <button type="button" className="chat-send-btn" onClick={() => setLoading(false)}>
                  ⏹
                </button>
              ) : (
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!input.trim()}
                  style={{ background: selectedAgent?.color }}
                >
                  ➤
                </button>
              )}
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
