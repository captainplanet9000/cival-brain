'use client';

import { useState, useEffect } from 'react';
import Nav from '@/components/Nav';

interface Memory {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  agent_ids: string[];
  is_active: boolean;
  is_pinned: boolean;
  collection_id: string | null;
  source: string;
  token_count: number;
  created_at: string;
  updated_at: string;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_default: boolean;
  memory_count?: number;
  active_count?: number;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
}

const CATEGORIES = ['all', 'general', 'project', 'preference', 'fact', 'instruction', 'document'];

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [showEditor, setShowEditor] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  // Editor state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [editTags, setEditTags] = useState('');
  const [editAgentIds, setEditAgentIds] = useState<string[]>([]);
  const [editCollectionId, setEditCollectionId] = useState<string>('');
  const [editIsPinned, setEditIsPinned] = useState(false);

  // Import state
  const [importContent, setImportContent] = useState('');
  const [importAutoSplit, setImportAutoSplit] = useState(true);

  useEffect(() => {
    fetchCollections();
    fetchAgents();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [selectedCollection, selectedCategory, searchQuery, activeOnly, pinnedOnly, selectedAgentFilter]);

  const fetchMemories = async () => {
    const params = new URLSearchParams();
    if (selectedCollection !== 'all') params.append('collection_id', selectedCollection);
    if (selectedCategory !== 'all') params.append('category', selectedCategory);
    if (searchQuery) params.append('search', searchQuery);
    if (activeOnly) params.append('active_only', 'true');
    if (pinnedOnly) params.append('pinned_only', 'true');
    if (selectedAgentFilter !== 'all') params.append('agent_id', selectedAgentFilter);

    const res = await fetch(`/api/brain-memories?${params}`);
    const data = await res.json();
    setMemories(data);
  };

  const fetchCollections = async () => {
    const res = await fetch('/api/brain-memories/collections');
    const data = await res.json();
    setCollections(data);
  };

  const fetchAgents = async () => {
    const res = await fetch('/api/brain-agents');
    const data = await res.json();
    setAgents(data.agents || data || []);
  };

  const fetchStats = async () => {
    const res = await fetch('/api/brain-memories/stats');
    const data = await res.json();
    setStats(data);
  };

  const handleCreateMemory = () => {
    setSelectedMemory(null);
    setEditTitle('');
    setEditContent('');
    setEditCategory('general');
    setEditTags('');
    setEditAgentIds([]);
    setEditCollectionId(collections.find(c => c.is_default)?.id || '');
    setEditIsPinned(false);
    setShowEditor(true);
  };

  const handleEditMemory = (memory: Memory) => {
    setSelectedMemory(memory);
    setEditTitle(memory.title);
    setEditContent(memory.content);
    setEditCategory(memory.category);
    setEditTags(memory.tags.join(', '));
    setEditAgentIds(memory.agent_ids);
    setEditCollectionId(memory.collection_id || '');
    setEditIsPinned(memory.is_pinned);
    setShowEditor(true);
  };

  const handleSaveMemory = async () => {
    const payload = {
      title: editTitle,
      content: editContent,
      category: editCategory,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
      agent_ids: editAgentIds,
      collection_id: editCollectionId || null,
      is_pinned: editIsPinned,
    };

    if (selectedMemory) {
      await fetch(`/api/brain-memories/${selectedMemory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/brain-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setShowEditor(false);
    fetchMemories();
    fetchStats();
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('Delete this memory?')) return;
    await fetch(`/api/brain-memories/${id}`, { method: 'DELETE' });
    fetchMemories();
    fetchStats();
    setShowEditor(false);
  };

  const handleTogglePin = async (memory: Memory) => {
    await fetch(`/api/brain-memories/${memory.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: !memory.is_pinned }),
    });
    fetchMemories();
  };

  const handleToggleActive = async (memory: Memory) => {
    await fetch(`/api/brain-memories/${memory.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !memory.is_active }),
    });
    fetchMemories();
    fetchStats();
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedMemories);
    if (ids.length === 0) return;

    let payload: any = { action, ids };
    
    if (action === 'move') {
      const collectionId = prompt('Enter collection ID to move to:');
      if (!collectionId) return;
      payload.collection_id = collectionId;
    }

    if (action === 'delete' && !confirm(`Delete ${ids.length} memories?`)) return;

    await fetch('/api/brain-memories/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSelectedMemories(new Set());
    fetchMemories();
    fetchStats();
  };

  const handleImport = async () => {
    await fetch('/api/brain-memories/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: importContent,
        auto_split: importAutoSplit,
        collection_id: collections.find(c => c.is_default)?.id,
      }),
    });

    setShowImportModal(false);
    setImportContent('');
    fetchMemories();
    fetchStats();
  };

  const handleExport = async (format: string) => {
    const res = await fetch(`/api/brain-memories/export?format=${format}`);
    if (format === 'json') {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memories-${Date.now()}.json`;
      a.click();
    } else {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memories-${Date.now()}.md`;
      a.click();
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    setEditAgentIds(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: any = {
      general: '#6366f1',
      project: '#10B981',
      preference: '#EC4899',
      fact: '#F59E0B',
      instruction: '#8B5CF6',
      document: '#3B82F6',
    };
    return colors[category] || '#6366f1';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Nav />
      
      {/* Left Sidebar - Collections */}
      <div style={{ 
        width: '220px', 
        borderRight: '1px solid var(--border-subtle)', 
        padding: '20px',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            COLLECTIONS
          </h3>
          <div
            onClick={() => setSelectedCollection('all')}
            className={selectedCollection === 'all' ? 'memory-collection-active' : 'memory-collection'}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: selectedCollection === 'all' ? 'var(--bg-elevated)' : 'transparent',
            }}
          >
            <span>🌐</span>
            <span style={{ flex: 1, fontSize: '14px' }}>All Memories</span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{stats?.total || 0}</span>
          </div>
          {collections.map(col => (
            <div
              key={col.id}
              onClick={() => setSelectedCollection(col.id)}
              className={selectedCollection === col.id ? 'memory-collection-active' : 'memory-collection'}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: selectedCollection === col.id ? 'var(--bg-elevated)' : 'transparent',
              }}
            >
              <span>{col.icon}</span>
              <span style={{ flex: 1, fontSize: '14px' }}>{col.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{col.active_count || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Center Panel - Memory List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Stats Bar */}
        <div className="memory-stats-bar" style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Total:</span>
            <span style={{ fontSize: '20px', fontWeight: '600', marginLeft: '8px' }}>{stats?.total || 0}</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Active:</span>
            <span style={{ fontSize: '20px', fontWeight: '600', marginLeft: '8px', color: 'var(--green)' }}>{stats?.active || 0}</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Tokens:</span>
            <span style={{ fontSize: '16px', fontWeight: '500', marginLeft: '8px' }}>{stats?.total_tokens?.toLocaleString() || 0}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={handleCreateMemory} style={{
            padding: '8px 16px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: '500',
          }}>
            + New Memory
          </button>
          <button onClick={() => setShowImportModal(true)} style={{
            padding: '8px 16px',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}>
            Import
          </button>
          <button onClick={() => handleExport('markdown')} style={{
            padding: '8px 16px',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}>
            Export
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="memory-category-badge"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  background: selectedCategory === cat ? getCategoryColor(cat) : 'var(--bg-elevated)',
                  color: selectedCategory === cat ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
              Active only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input type="checkbox" checked={pinnedOnly} onChange={(e) => setPinnedOnly(e.target.checked)} />
              Pinned only
            </label>
            <select
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <option value="all">All agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.emoji} {agent.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedMemories.size > 0 && (
          <div style={{
            padding: '12px 20px',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '14px' }}>{selectedMemories.size} selected</span>
            <button onClick={() => handleBulkAction('activate')} style={{ padding: '6px 12px', fontSize: '13px' }}>Activate</button>
            <button onClick={() => handleBulkAction('deactivate')} style={{ padding: '6px 12px', fontSize: '13px' }}>Deactivate</button>
            <button onClick={() => handleBulkAction('delete')} style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--rose)' }}>Delete</button>
            <button onClick={() => setSelectedMemories(new Set())} style={{ padding: '6px 12px', fontSize: '13px' }}>Clear</button>
          </div>
        )}

        {/* Memory Cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {memories.map(memory => (
            <div
              key={memory.id}
              className="memory-card"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '12px',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => handleEditMemory(memory)}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedMemories.has(memory.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newSet = new Set(selectedMemories);
                    if (newSet.has(memory.id)) newSet.delete(memory.id);
                    else newSet.add(memory.id);
                    setSelectedMemories(newSet);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{memory.title}</h3>
                    {memory.is_pinned && <span>📌</span>}
                    <span
                      className="memory-category-badge"
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        borderRadius: 'var(--radius-sm)',
                        background: getCategoryColor(memory.category),
                        color: 'white',
                      }}
                    >
                      {memory.category}
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '14px', 
                    color: 'var(--text-secondary)', 
                    margin: '0 0 8px 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {memory.content}
                  </p>
                  {memory.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {memory.tags.map(tag => (
                        <span key={tag} className="memory-tag" style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          background: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-tertiary)',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    <span>{new Date(memory.updated_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{memory.token_count} tokens</span>
                    <span>•</span>
                    <span>{memory.agent_ids.length === 0 ? 'All agents' : `${memory.agent_ids.length} agent(s)`}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(memory);
                      }}
                      style={{
                        marginLeft: 'auto',
                        padding: '4px 10px',
                        fontSize: '11px',
                        background: memory.is_active ? 'var(--green)' : 'var(--bg-elevated)',
                        color: memory.is_active ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      {memory.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {memories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              No memories found
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Editor */}
      {showEditor && (
        <div className="memory-editor" style={{
          width: '400px',
          borderLeft: '1px solid var(--border-subtle)',
          padding: '20px',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>
            {selectedMemory ? 'Edit Memory' : 'New Memory'}
          </h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Content</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Category</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
            >
              {CATEGORIES.filter(c => c !== 'all').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Tags (comma-separated)</label>
            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Collection</label>
            <select
              value={editCollectionId}
              onChange={(e) => setEditCollectionId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">None</option>
              {collections.map(col => (
                <option key={col.id} value={col.id}>{col.icon} {col.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Agent Access (empty = all agents)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {agents.map(agent => (
                <label key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={editAgentIds.includes(agent.id)}
                    onChange={() => toggleAgentSelection(agent.id)}
                  />
                  <span>{agent.emoji} {agent.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={editIsPinned}
                onChange={(e) => setEditIsPinned(e.target.checked)}
              />
              Pin this memory
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSaveMemory}
              style={{
                flex: 1,
                padding: '10px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Save
            </button>
            <button
              onClick={() => setShowEditor(false)}
              style={{
                flex: 1,
                padding: '10px',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>

          {selectedMemory && (
            <button
              onClick={() => handleDeleteMemory(selectedMemory.id)}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px',
                background: 'transparent',
                color: 'var(--rose)',
                border: '1px solid var(--rose)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Delete Memory
            </button>
          )}

          {selectedMemory && (
            <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Created: {new Date(selectedMemory.created_at).toLocaleString()}<br />
              Updated: {new Date(selectedMemory.updated_at).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="memory-import-modal" style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            width: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Import Memories</h2>
            
            <textarea
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              placeholder="Paste markdown or text content here..."
              rows={15}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={importAutoSplit}
                onChange={(e) => setImportAutoSplit(e.target.checked)}
              />
              Auto-split by ## headers
            </label>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleImport}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Import
              </button>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
