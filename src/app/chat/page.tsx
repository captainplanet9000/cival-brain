'use client';

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  results?: SearchResult[];
}

interface SearchResult {
  type: string;
  title: string;
  snippet: string;
  icon: string;
}

type Mode = 'search' | 'openclaw';

function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="code-block">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br/>');
  return <div className="msg-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: '**Welcome to Cival Brain Chat.** Use **Brain Search** to query your data across all tables, or **OpenClaw Bridge** to talk to your AI agent.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('search');
  const [gatewayStatus, setGatewayStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    fetch('/api/openclaw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' }),
    }).then(r => r.json()).then(d => setGatewayStatus(d.status === 'online' ? 'online' : 'offline')).catch(() => setGatewayStatus('offline'));
  }, []);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      if (mode === 'search') {
        // Brain search
        const res = await fetch('/api/openclaw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'search', params: { query: text } }),
        });
        const data = await res.json();
        const results: SearchResult[] = data.results || [];

        // Also search local docs/tasks/pins
        const localRes = await fetch(`/api/search?q=${encodeURIComponent(text)}`);
        const localData = await localRes.json();
        if (Array.isArray(localData)) {
          localData.forEach((r: any) => results.push(r));
        }

        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: results.length > 0
            ? `Found **${results.length}** results for "${text}":`
            : `No results found for "${text}". Try different keywords or check the Ops, Content, or Revenue pages directly.`,
          timestamp: new Date(),
          results: results.length > 0 ? results : undefined,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        // OpenClaw bridge
        const res = await fetch('/api/openclaw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chat', params: { message: text } }),
        });
        const data = await res.json();
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.error
            ? `⚠️ ${data.error}${data.details ? `\n\n${data.details}` : ''}`
            : data.response || data.message || JSON.stringify(data),
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`, role: 'assistant',
        content: `⚠️ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as FormEvent); }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>🧠 Cival Brain Chat</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setMode('search')}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border-subtle)',
                background: mode === 'search' ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                color: mode === 'search' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >🔍 Brain Search</button>
            <button
              onClick={() => setMode('openclaw')}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border-subtle)',
                background: mode === 'openclaw' ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                color: mode === 'openclaw' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >🤖 OpenClaw Bridge</button>
          </div>
          <span style={{ fontSize: '0.75rem', color: gatewayStatus === 'online' ? 'var(--green)' : 'var(--text-tertiary)' }}>
            ● Gateway: {gatewayStatus}
          </span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-avatar">
              {msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🧠' : '💡'}
            </div>
            <div className="chat-msg-body">
              <MarkdownContent content={msg.content} />
              {msg.results && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {msg.results.map((r, i) => (
                    <div key={i} style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)', padding: '10px 12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span>{r.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{r.title}</span>
                        <span className="badge badge-notes" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>{r.type}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r.snippet?.slice(0, 200)}</div>
                    </div>
                  ))}
                </div>
              )}
              <span className="chat-msg-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-avatar">🧠</div>
            <div className="chat-msg-body">
              <div className="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={sendMessage}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'search' ? 'Search your brain...' : 'Send a message to OpenClaw...'}
          rows={1}
          disabled={loading}
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? '⏳' : '➤'}
        </button>
      </form>
    </div>
  );
}
