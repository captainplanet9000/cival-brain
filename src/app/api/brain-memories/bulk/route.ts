import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await request.json();
    
    const { action, ids, collection_id } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Action and ids array required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'activate':
        result = await supabase
          .from('brain_memories')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .in('id', ids);
        break;

      case 'deactivate':
        result = await supabase
          .from('brain_memories')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', ids);
        break;

      case 'delete':
        result = await supabase
          .from('brain_memories')
          .delete()
          .in('id', ids);
        break;

      case 'move':
        if (!collection_id) {
          return NextResponse.json(
            { error: 'collection_id required for move action' },
            { status: 400 }
          );
        }
        result = await supabase
          .from('brain_memories')
          .update({ collection_id, updated_at: new Date().toISOString() })
          .in('id', ids);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: activate, deactivate, delete, or move' },
          { status: 400 }
        );
    }

    if (result.error) throw result.error;

    return NextResponse.json({ 
      success: true, 
      affected: ids.length 
    });
  } catch (error: any) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
