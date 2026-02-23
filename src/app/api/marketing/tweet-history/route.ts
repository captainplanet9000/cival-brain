import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const TWEET_HISTORY_FILE = path.join(process.cwd(), 'data', 'tweet-history.json');

interface Tweet {
  id: string;
  text: string;
  account: string;
  posted_at: string;
  likes?: number;
  retweets?: number;
  impressions?: number;
  campaign_id?: string;
  url?: string;
}

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function readTweetHistory(): Promise<Tweet[]> {
  try {
    await ensureDataDir();
    const content = await fs.readFile(TWEET_HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist yet, return empty array
    return [];
  }
}

async function writeTweetHistory(tweets: Tweet[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(TWEET_HISTORY_FILE, JSON.stringify(tweets, null, 2), 'utf-8');
}

// GET - List all posted tweets with engagement data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const account = searchParams.get('account');

    let tweets = await readTweetHistory();

    // Filter by account if specified
    if (account) {
      tweets = tweets.filter(t => t.account === account);
    }

    // Sort by posted date (most recent first)
    tweets.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());

    // Limit results
    tweets = tweets.slice(0, limit);

    return NextResponse.json({
      tweets,
      count: tweets.length,
    });
  } catch (error) {
    console.error('Tweet history GET error:', error);
    return NextResponse.json({
      tweets: [],
      error: error instanceof Error ? error.message : 'Unknown error fetching tweet history',
    }, { status: 500 });
  }
}

// POST - Record a new tweet
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { id, text, account, posted_at, likes, retweets, impressions, campaign_id, url } = body;

    if (!id || !text) {
      return NextResponse.json({
        success: false,
        error: 'Tweet ID and text are required',
      }, { status: 400 });
    }

    const tweets = await readTweetHistory();

    // Check if tweet already exists
    const existingIndex = tweets.findIndex(t => t.id === id);
    
    const newTweet: Tweet = {
      id,
      text,
      account: account || 'primary',
      posted_at: posted_at || new Date().toISOString(),
      likes,
      retweets,
      impressions,
      campaign_id,
      url: url || `https://x.com/i/status/${id}`,
    };

    if (existingIndex >= 0) {
      // Update existing tweet
      tweets[existingIndex] = { ...tweets[existingIndex], ...newTweet };
    } else {
      // Add new tweet
      tweets.push(newTweet);
    }

    await writeTweetHistory(tweets);

    return NextResponse.json({
      success: true,
      tweet: newTweet,
    });
  } catch (error) {
    console.error('Tweet history POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error recording tweet',
    }, { status: 500 });
  }
}

// PUT - Update tweet engagement data
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    const { id, likes, retweets, impressions } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Tweet ID is required',
      }, { status: 400 });
    }

    const tweets = await readTweetHistory();
    const tweetIndex = tweets.findIndex(t => t.id === id);

    if (tweetIndex < 0) {
      return NextResponse.json({
        success: false,
        error: 'Tweet not found',
      }, { status: 404 });
    }

    // Update engagement metrics
    tweets[tweetIndex] = {
      ...tweets[tweetIndex],
      likes: likes !== undefined ? likes : tweets[tweetIndex].likes,
      retweets: retweets !== undefined ? retweets : tweets[tweetIndex].retweets,
      impressions: impressions !== undefined ? impressions : tweets[tweetIndex].impressions,
    };

    await writeTweetHistory(tweets);

    return NextResponse.json({
      success: true,
      tweet: tweets[tweetIndex],
    });
  } catch (error) {
    console.error('Tweet history PUT error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating tweet',
    }, { status: 500 });
  }
}
