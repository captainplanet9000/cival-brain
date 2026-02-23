import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getAgentContext } from '@/lib/agent-context';

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL!;
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN!;

// Model routing logic
function selectModel(message: string, modelPreference: string | null): string {
  if (modelPreference && modelPreference !== 'auto') {
    return modelPreference;
  }

  // Auto mode: analyze message complexity
  const wordCount = message.split(/\s+/).length;
  const hasCode = /```|function|class|import|const|let|var/.test(message);
  const isComplex = wordCount > 100 || hasCode || 
    /analyze|compare|explain|debug|optimize|refactor/.test(message.toLowerCase());
  const isCreative = /write|create|story|poem|draft|compose/.test(message.toLowerCase());

  if (isComplex) {
    return 'anthropic/claude-opus-4-6'; // Complex reasoning
  } else if (isCreative) {
    return 'anthropic/claude-sonnet-4'; // Creative tasks
  } else {
    return 'google/gemini-2.5-flash'; // Simple queries
  }
}

// Extract entities from conversation for graph memory
async function extractEntities(conversationText: string): Promise<any[]> {
  try {
    const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Fast model for extraction
        messages: [{
          role: 'user',
          content: `Extract key entities from this conversation. Return a JSON array of entities with format:
[{"label": "entity name", "type": "person|project|decision|concept", "relationships": [{"target": "other entity", "relation": "works_on|decided|related_to"}]}]

Conversation:
${conversationText}

Return ONLY the JSON array, no other text.`
        }],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('Entity extraction failed:', error);
    return [];
  }
}

// Extract and score memory importance
async function extractMemories(conversationText: string, agentId: string, conversationId: string): Promise<void> {
  const supabase = getServiceSupabase();

  try {
    const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Extract important facts from this conversation. Return JSON array:
[{"fact": "the fact", "importance": 1-5, "category": "decision|fact|preference|context"}]

Only include facts with importance >= 3. Return ONLY the JSON array.

Conversation:
${conversationText}`
        }],
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const memories = JSON.parse(jsonMatch[0]);
    
    // Store high-importance memories
    for (const mem of memories) {
      if (mem.importance >= 3) {
        await supabase.from('brain_memories').insert({
          title: mem.fact.substring(0, 100),
          content: mem.fact,
          category: mem.category || 'general',
          agent_ids: [agentId],
          tags: [conversationId],
          is_active: true,
          is_pinned: mem.importance >= 5,
        });
      }
    }
  } catch (error) {
    console.error('Memory extraction failed:', error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getServiceSupabase();
  const { id: agentId } = await params;
  const { conversationId, message, model: requestedModel } = await request.json();

  try {
    // Get the agent
    const { data: agent, error: agentError } = await supabase
      .from('brain_agents')
      .select('system_prompt, name')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ 
        success: false, 
        error: 'Agent not found' 
      }, { status: 404 });
    }

    // Get conversation for model preference
    const { data: conversation } = await supabase
      .from('brain_conversations')
      .select('model_preference')
      .eq('id', conversationId)
      .single();

    // Select model
    const selectedModel = requestedModel || selectModel(message, conversation?.model_preference || null);

    // Fetch live data context
    console.log(`Fetching live data for ${agent.name}...`);
    const context = await getAgentContext(agent.name);
    
    // Fetch relevant memories
    const { data: memories } = await supabase
      .from('brain_memories')
      .select('title, content, category, tags')
      .eq('is_active', true)
      .or(`agent_ids.cs.{${agentId}},agent_ids.eq.{}`)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(50);

    // Build memory context
    const memoryContext = memories && memories.length > 0
      ? memories.map(m => `### ${m.title} [${m.category}]\n${m.content}`).join('\n\n')
      : '';
    
    // Enhanced system prompt
    const enhancedSystemPrompt = `${agent.system_prompt}

${memoryContext ? `## PERSISTENT MEMORY & CONTEXT
The following knowledge has been stored for your reference:

${memoryContext}

---

` : ''}## LIVE DATA (as of ${context.timestamp})

${context.data}

---

Use this live data and persistent memory to provide accurate, current answers.

## SPECIAL CAPABILITIES

You can use these special code blocks in your responses:

1. Shell commands: \`\`\`shell:execute
   git status
   \`\`\`
   
2. Web browsing: \`\`\`browse:url
   https://example.com
   \`\`\`

These will be executed by the system and results shown to the user.`;

    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from('brain_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Save user message
    const { error: saveUserError } = await supabase
      .from('brain_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      });

    if (saveUserError) throw saveUserError;

    // Build chat history
    const chatHistory = [
      { role: 'system', content: enhancedSystemPrompt },
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // Call OpenClaw gateway
    const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        messages: chatHistory,
        model: selectedModel,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenClaw error ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || data.response || 'No response from AI';

    // Save assistant message
    const { error: saveAssistantError } = await supabase
      .from('brain_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage,
        metadata: { model: selectedModel },
      });

    if (saveAssistantError) throw saveAssistantError;

    // Update conversation timestamp
    await supabase
      .from('brain_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Background: Extract entities for graph memory
    const conversationText = `User: ${message}\nAssistant: ${assistantMessage}`;
    extractEntities(conversationText).then(async (entities) => {
      if (entities.length === 0) return;

      const supabase = getServiceSupabase();
      
      // Create nodes
      const nodeInserts = entities.map(e => ({
        label: e.label,
        type: e.type,
        embedding_text: `${e.label} (${e.type})`,
      }));

      const { data: nodes } = await supabase
        .from('memory_nodes')
        .insert(nodeInserts)
        .select();

      if (!nodes || nodes.length === 0) return;

      // Create edges
      const edgeInserts: any[] = [];
      entities.forEach((entity, idx) => {
        if (!entity.relationships) return;
        entity.relationships.forEach((rel: any) => {
          const targetNode = nodes.find(n => n.label === rel.target);
          if (targetNode) {
            edgeInserts.push({
              source_node_id: nodes[idx].id,
              target_node_id: targetNode.id,
              relationship: rel.relation,
              weight: 1.0,
            });
          }
        });
      });

      if (edgeInserts.length > 0) {
        await supabase.from('memory_edges').insert(edgeInserts);
      }
    }).catch(err => console.error('Graph memory error:', err));

    // Background: Extract and store important memories
    extractMemories(conversationText, agentId, conversationId)
      .catch(err => console.error('Memory extraction error:', err));

    return NextResponse.json({ 
      success: true, 
      response: assistantMessage,
      model: selectedModel,
      memoriesCount: memories?.length || 0,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Chat failed' 
    }, { status: 500 });
  }
}
