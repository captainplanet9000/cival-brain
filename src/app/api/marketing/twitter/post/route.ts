import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { text, account } = await request.json();
    
    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'Tweet text is required',
      }, { status: 400 });
    }

    // Credentials from env vars
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessSecret = process.env.X_ACCESS_SECRET;
    
    if (!apiKey || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Twitter API not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET env vars.',
        setup_url: 'https://developer.x.com/en/portal/dashboard'
      }, { status: 503 });
    }

    // Create Twitter client
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken,
      accessSecret,
    });

    // Post tweet
    const { data } = await client.v2.tweet(text);
    
    // Log to Supabase marketing_tweets table
    const supabase = getServiceSupabase();
    await supabase.from('marketing_tweets').insert({
      tweet_id: data.id,
      text,
      account: account || 'primary',
      posted_at: new Date().toISOString(),
      url: `https://x.com/i/status/${data.id}`,
    });
    
    return NextResponse.json({
      success: true,
      tweetId: data.id,
      url: `https://x.com/i/status/${data.id}`,
      text,
    });
  } catch (error) {
    console.error('Twitter post error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error posting tweet',
    }, { status: 500 });
  }
}
