import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET - List all campaigns with metrics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // Filter by status

    const supabase = getServiceSupabase();
    
    let query = supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      return NextResponse.json({
        campaigns: [],
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      campaigns: campaigns || [],
      count: campaigns?.length || 0,
    });
  } catch (error) {
    console.error('Campaigns GET error:', error);
    return NextResponse.json({
      campaigns: [],
      error: error instanceof Error ? error.message : 'Unknown error fetching campaigns',
    }, { status: 500 });
  }
}

// POST - Create new campaign
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { name, platform, status, start_date, end_date, budget, description } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Campaign name is required',
      }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        name,
        platform: platform || 'twitter',
        status: status || 'active',
        start_date,
        end_date,
        budget,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaign: data,
    });
  } catch (error) {
    console.error('Campaigns POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating campaign',
    }, { status: 500 });
  }
}

// PUT - Update campaign
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Campaign ID is required',
      }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaign: data,
    });
  } catch (error) {
    console.error('Campaigns PUT error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating campaign',
    }, { status: 500 });
  }
}

// DELETE - Archive campaign
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Campaign ID is required',
      }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    
    // Soft delete by setting status to 'archived'
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaign: data,
    });
  } catch (error) {
    console.error('Campaigns DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error archiving campaign',
    }, { status: 500 });
  }
}
