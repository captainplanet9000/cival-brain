import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

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

    // Build message history for OpenClaw
    const chatHistory = [
      { role: 'system', content: agent.system_prompt },
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // Call OpenClaw gateway
    const response = await fetch(`${OPENCLAW_URL}/api/v1/chat`, {
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
      throw new Error(`OpenClaw error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.response || data.message || 'No response from AI';

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
