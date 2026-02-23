import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // For now, return mock trending topics
    // When Twitter API access is available, this will scrape or use the API
    
    const mockTrends = {
      location: 'United States',
      trends: [
        {
          name: '#AI',
          tweet_count: 127000,
          category: 'Technology',
          url: 'https://x.com/search?q=%23AI',
        },
        {
          name: '#CryptoTrading',
          tweet_count: 89000,
          category: 'Finance',
          url: 'https://x.com/search?q=%23CryptoTrading',
        },
        {
          name: '#NFT',
          tweet_count: 67000,
          category: 'Technology',
          url: 'https://x.com/search?q=%23NFT',
        },
        {
          name: '#TikTok',
          tweet_count: 245000,
          category: 'Social Media',
          url: 'https://x.com/search?q=%23TikTok',
        },
        {
          name: '#ContentCreation',
          tweet_count: 42000,
          category: 'Marketing',
          url: 'https://x.com/search?q=%23ContentCreation',
        },
      ],
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(mockTrends);
  } catch (error) {
    console.error('Twitter trending error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error fetching trends',
    }, { status: 500 });
  }
}
