import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = getServiceSupabase();
    
    // Fetch recent tweets from marketing_tweets table
    const { data: tweets, error } = await supabase
      .from('marketing_tweets')
      .select('*')
      .order('posted_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({
        tweets: [],
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      tweets: tweets || [],
      count: tweets?.length || 0,
    });
  } catch (error) {
    console.error('Recent tweets error:', error);
    return NextResponse.json({
      tweets: [],
      error: error instanceof Error ? error.message : 'Unknown error fetching recent tweets',
    }, { status: 500 });
  }
}
