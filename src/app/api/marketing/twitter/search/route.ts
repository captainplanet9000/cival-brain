import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'latest'; // latest or top

    if (!query) {
      return NextResponse.json({
        error: 'Query parameter "q" is required',
      }, { status: 400 });
    }

    // For now, return mock search results
    // When Twitter API access is available, this will use web_fetch or Twitter API
    
    const mockResults = {
      query,
      type,
      results: [
        {
          id: '9876543210',
          text: `Just saw @CivalSystems mentioned in a trading forum! ${query}`,
          author: '@trader_joe',
          author_name: 'Joe the Trader',
          likes: 23,
          retweets: 7,
          replies: 4,
          posted_at: '2026-02-22T18:45:00Z',
          url: 'https://x.com/trader_joe/status/9876543210',
        },
        {
          id: '9876543211',
          text: `Anyone else following ${query}? Their system looks interesting.`,
          author: '@crypto_watcher',
          author_name: 'Crypto Watcher',
          likes: 15,
          retweets: 3,
          replies: 2,
          posted_at: '2026-02-22T16:30:00Z',
          url: 'https://x.com/crypto_watcher/status/9876543211',
        },
      ],
    };

    return NextResponse.json(mockResults);
  } catch (error) {
    console.error('Twitter search error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error searching Twitter',
    }, { status: 500 });
  }
}
