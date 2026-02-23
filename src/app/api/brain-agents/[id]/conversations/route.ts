import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getServiceSupabase();
  const { id: agentId } = await params;

  try {
    const { data, error } = await supabase
      .from('brain_conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        brain_messages (
          id,
          content,
          role,
          created_at
        )
      `)
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Get last message preview for each conversation
    const conversations = (data || []).map(conv => {
      const messages = (conv.brain_messages as any[]) || [];
      const lastMessage = messages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      
      return {
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        lastMessagePreview: lastMessage ? lastMessage.content.slice(0, 80) : '',
        messageCount: messages.length,
      };
    });

    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch conversations' 
    }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getServiceSupabase();
  const { id: agentId } = await params;
  const { title } = await request.json();

  try {
    const { data, error } = await supabase
      .from('brain_conversations')
      .insert({
        agent_id: agentId,
        title: title || 'New Conversation',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, conversation: data });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create conversation' 
    }, { status: 500 });
  }
}
