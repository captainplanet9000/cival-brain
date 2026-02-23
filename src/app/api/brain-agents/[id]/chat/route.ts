import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getAgentContext } from '@/lib/agent-context';

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL!;
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN!;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getServiceSupabase();
  const { id: agentId } = await params;
  const { conversationId, message } = await request.json();

  try {
    // Get the agent to fetch system prompt
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

    // Fetch live data context for this agent type
    console.log(`Fetching live data for ${agent.name}...`);
    const context = await getAgentContext(agent.name);
    
    // Fetch memories relevant to this agent
    const { data: memories } = await supabase
      .from('brain_memories')
      .select('title, content, category, tags')
      .eq('is_active', true)
      .or(`agent_ids.cs.{${agentId}},agent_ids.eq.{}`)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(50);

    // Build memory context string
    const memoryContext = memories && memories.length > 0
      ? memories.map(m => `### ${m.title} [${m.category}]\n${m.content}`).join('\n\n')
      : '';
    
    // Build enhanced system prompt with live data and persistent memory
    const enhancedSystemPrompt = `${agent.system_prompt}

${memoryContext ? `## PERSISTENT MEMORY & CONTEXT
The following knowledge items have been stored for your reference:

${memoryContext}

---

` : ''}## LIVE DATA (as of ${context.timestamp})

${context.data}

---

Use this live data and persistent memory to provide accurate, current answers. Reference specific numbers and statuses from the data above.`;

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

    // Build message history for OpenClaw with enhanced system prompt
    const chatHistory = [
      { role: 'system', content: enhancedSystemPrompt },
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // Call OpenClaw gateway (OpenAI-compatible endpoint)
    const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        messages: chatHistory,
        model: 'anthropic/claude-sonnet-4',
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
      });

    if (saveAssistantError) throw saveAssistantError;

    // Update conversation timestamp
    await supabase
      .from('brain_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({ 
      success: true, 
      response: assistantMessage 
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Chat failed' 
    }, { status: 500 });
  }
}
