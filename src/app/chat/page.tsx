'use client';

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
    }).then(r => r.json())
      .then(d => setGatewayStatus(d.status === 'online' ? 'online' : 'offline'))
      .catch(() => setGatewayStatus('offline'));
  }, []);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history for the API (last 20 messages)
      const chatHistory = newMessages
        .filter(m => m.role !== 'system')
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/openclaw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'chat', 
          params: { messages: chatHistory } 
        }),
      });
      const data = await res.json();
      
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.error
          ? `⚠️ ${data.error}${data.details ? `\n\n${data.details}` : ''}`
          : data.response || 'No response received.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`, 
        role: 'assistant',
        content: `⚠️ Connection error: ${err instanceof Error ? err.message : 'Could not reach gateway'}`,
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
        <h1>🧠 Ask Your Brain</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Chat with your AI agent — powered by Claude Opus via OpenClaw
        </p>
        <span style={{ 
          fontSize: '0.75rem', 
          color: gatewayStatus === 'online' ? 'var(--green)' : gatewayStatus === 'checking' ? 'var(--amber)' : 'var(--rose)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '4px',
        }}>
          ● {gatewayStatus === 'checking' ? 'Connecting...' : gatewayStatus === 'online' ? 'Connected' : 'Offline'}
        </span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '16px',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            padding: '40px 20px',
          }}>
            <span style={{ fontSize: '48px', opacity: 0.4 }}>🧠</span>
            <p style={{ fontSize: '0.92rem', maxWidth: '400px', lineHeight: 1.6 }}>
              Ask anything about your business, projects, trading, content pipeline, or get help with tasks.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {[
                'How are my trades doing?',
                'What content is in the pipeline?',
                'Summarize active projects',
                'What should I focus on today?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  style={{
                    padding: '8px 14px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-avatar">
              {msg.role === 'user' ? '👤' : '🧠'}
            </div>
            <div className="chat-msg-body">
              <MarkdownContent content={msg.content} />
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
          placeholder="Ask your brain anything..."
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
