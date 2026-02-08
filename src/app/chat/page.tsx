'use client';

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown rendering: bold, italic, code blocks, inline code, links, headers
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
      content: 'Welcome to **Ask Your Brain**. Send a message to chat with your OpenClaw agent.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
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

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Failed to reach the agent: ${err instanceof Error ? err.message : 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as unknown as FormEvent);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>🧠 Ask Your Brain</h1>
        <p className="text-secondary">Chat with your OpenClaw agent</p>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-avatar">
              {msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🧠' : '💡'}
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
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={sendMessage}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
