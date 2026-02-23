'use client';

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';

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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

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
        setSelectedAgent(data.agents[0]); // Auto-select first agent
      } else {
        // Try to seed if no agents exist
        await fetch('/api/brain-agents/seed', { method: 'POST' });
        loadAgents(); // Reload after seeding
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
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || !selectedAgent || !selectedConversation) return;

    setInput('');
    setLoading(true);

    // Optimistically add user message
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
        // Reload messages to get the actual saved ones
        await loadMessages(selectedConversation.id);
        await loadConversations(selectedAgent.id); // Update conversation list with new timestamp
      } else {
        // Show error in chat
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
      sendMessage(e as unknown as FormEvent);
    }
  };

  const getAgentSuggestedPrompts = (agent: Agent | null) => {
    if (!agent) return [];
    
    switch (agent.emoji) {
      case '🔬': // Strategy Lab
        return [
          'Show me top performing agents this week',
          'Backtest a Darvas breakout strategy',
          'What should I optimize next?',
          'Analyze recent P&L trends',
        ];
      case '📡': // Content Scout
        return [
          'What\'s trending on TikTok today?',
          'Suggest viral video ideas',
          'Review upcoming content calendar',
          'What works best for Honey Bunny?',
        ];
      case '🏥': // System Health
        return [
          'Check system status',
          'Show API response times',
          'Any errors in the last 24h?',
          'Is the trading pipeline healthy?',
        ];
      default:
        return [];
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - var(--header-h))',
      background: 'var(--bg-base)',
      overflow: 'hidden',
    }}>
      {/* Left Sidebar - Agents */}
      <div style={{
        width: '240px',
        minWidth: '240px',
        background: 'oklch(0.17 0.01 260)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🧠</span>
          <h2 style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>Specialist Agents</h2>
        </div>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {agents.map(agent => (
            <div
              key={agent.id}
              onClick={() => {
                setSelectedAgent(agent);
                setShowMobileMenu(false);
              }}
              style={{
                padding: '12px',
                background: selectedAgent?.id === agent.id ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                border: `1px solid ${selectedAgent?.id === agent.id ? agent.color : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (selectedAgent?.id !== agent.id) {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }
              }}
              onMouseLeave={e => {
                if (selectedAgent?.id !== agent.id) {
                  e.currentTarget.style.background = 'var(--bg-surface)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.3rem' }}>{agent.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {agent.name}
                  </div>
                </div>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: agent.status === 'active' ? 'var(--green)' : 'var(--text-tertiary)',
                }}></div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
                {agent.description}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.72rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: gatewayStatus === 'online' ? 'var(--green)' : gatewayStatus === 'checking' ? 'var(--amber)' : 'var(--rose)',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: gatewayStatus === 'online' ? 'var(--green)' : gatewayStatus === 'checking' ? 'var(--amber)' : 'var(--rose)',
          }}></span>
          {gatewayStatus === 'checking' ? 'Connecting...' : gatewayStatus === 'online' ? 'Gateway Online' : 'Gateway Offline'}
        </div>
      </div>

      {/* Center Panel - Conversations */}
      <div style={{
        width: '260px',
        minWidth: '260px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Conversations
          </div>
          <button
            onClick={createNewConversation}
            disabled={!selectedAgent}
            style={{
              padding: '8px 12px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: selectedAgent ? 'pointer' : 'not-allowed',
              opacity: selectedAgent ? 1 : 0.5,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => selectedAgent && (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            + New Chat
          </button>
        </div>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
        }}>
          {conversations.length === 0 && (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '0.82rem',
            }}>
              No conversations yet.<br />Start a new chat!
            </div>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              style={{
                padding: '10px 14px',
                background: selectedConversation?.id === conv.id ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: selectedConversation?.id === conv.id ? `2px solid ${selectedAgent?.color}` : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (selectedConversation?.id !== conv.id) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={e => {
                if (selectedConversation?.id !== conv.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {conv.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conv.lastMessagePreview || 'No messages'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                {new Date(conv.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-base)',
      }}>
        {/* Chat Header */}
        {selectedAgent && (
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '1.4rem' }}>{selectedAgent.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {selectedAgent.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {selectedAgent.description}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {!selectedConversation && (
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
              {selectedAgent && (
                <>
                  <span style={{ fontSize: '64px', opacity: 0.3 }}>{selectedAgent.emoji}</span>
                  <p style={{ fontSize: '0.92rem', maxWidth: '400px', lineHeight: 1.6 }}>
                    {selectedAgent.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                    {getAgentSuggestedPrompts(selectedAgent).map(q => (
                      <button
                        key={q}
                        onClick={() => {
                          if (!selectedConversation) {
                            createNewConversation().then(() => setInput(q));
                          } else {
                            setInput(q);
                          }
                          inputRef.current?.focus();
                        }}
                        style={{
                          padding: '8px 14px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '20px',
                          color: 'var(--text-secondary)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = selectedAgent.color;
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >{q}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
              <div className="chat-msg-avatar">
                {msg.role === 'user' ? '👤' : selectedAgent?.emoji}
              </div>
              <div className="chat-msg-body" style={{
                background: msg.role === 'user' ? `${selectedAgent?.color}22` : 'var(--bg-surface)',
                borderColor: msg.role === 'user' ? `${selectedAgent?.color}66` : 'var(--border-subtle)',
              }}>
                <MarkdownContent content={msg.content} />
                <span className="chat-msg-time">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-msg chat-msg-assistant">
              <div className="chat-msg-avatar">{selectedAgent?.emoji}</div>
              <div className="chat-msg-body">
                <div className="typing-indicator"><span></span><span></span><span></span></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {selectedConversation && (
          <form className="chat-input-bar" onSubmit={sendMessage} style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${selectedAgent?.name}...`}
              rows={1}
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()} style={{
              background: selectedAgent?.color || 'var(--accent)',
            }}>
              {loading ? '⏳' : '➤'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
