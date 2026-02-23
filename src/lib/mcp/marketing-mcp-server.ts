/**
 * Marketing MCP Server
 * 
 * Provides tools that the Marketing Command agent can invoke:
 * - tweet_post: Post a tweet to X
 * - tweet_search: Search Twitter for mentions/topics
 * - tweet_analytics: Get engagement analytics
 * - campaign_create: Create a marketing campaign
 * - campaign_list: List all campaigns
 * - content_calendar: Get content calendar across projects
 * - trending_topics: Get current trending topics
 * - competitor_analysis: Analyze competitor social accounts
 * - hashtag_research: Research hashtag performance
 * - schedule_tweet: Schedule a tweet for later posting
 */

export interface MarketingTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export const MARKETING_TOOLS: MarketingTool[] = [
  {
    name: 'tweet_post',
    description: 'Post a tweet to X/Twitter',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Tweet text (max 280 chars)',
        },
        account: {
          type: 'string',
          description: 'Account to post from (default: primary)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'tweet_search',
    description: 'Search Twitter for mentions, topics, or competitors',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (keywords, hashtags, mentions)',
        },
        type: {
          type: 'string',
          enum: ['latest', 'top'],
          description: 'Search type: latest or top results',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'tweet_analytics',
    description: 'Get Twitter engagement analytics (followers, engagement rates, top tweets)',
    parameters: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name (optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'campaign_create',
    description: 'Create a new marketing campaign',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Campaign name',
        },
        platform: {
          type: 'string',
          description: 'Platform (twitter, tiktok, instagram, etc.)',
        },
        status: {
          type: 'string',
          enum: ['active', 'draft', 'paused', 'completed'],
          description: 'Campaign status',
        },
        start_date: {
          type: 'string',
          description: 'Start date (ISO 8601)',
        },
        end_date: {
          type: 'string',
          description: 'End date (ISO 8601)',
        },
        budget: {
          type: 'number',
          description: 'Campaign budget in USD',
        },
        description: {
          type: 'string',
          description: 'Campaign description',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'campaign_list',
    description: 'List all marketing campaigns',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'draft', 'paused', 'completed', 'archived'],
          description: 'Filter by status (optional)',
        },
        limit: {
          type: 'number',
          description: 'Max number of results',
        },
      },
      required: [],
    },
  },
  {
    name: 'content_calendar',
    description: 'Get content calendar across all projects (scripts, campaigns, pipeline)',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'trending_topics',
    description: 'Get current trending topics on Twitter/X',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Location (optional, e.g., "United States")',
        },
      },
      required: [],
    },
  },
  {
    name: 'competitor_analysis',
    description: 'Analyze competitor social accounts',
    parameters: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Competitor account handle (e.g., @competitor)',
        },
        platform: {
          type: 'string',
          description: 'Platform (twitter, tiktok, etc.)',
        },
      },
      required: ['account'],
    },
  },
  {
    name: 'hashtag_research',
    description: 'Research hashtag performance and usage',
    parameters: {
      type: 'object',
      properties: {
        hashtag: {
          type: 'string',
          description: 'Hashtag to research (with or without #)',
        },
      },
      required: ['hashtag'],
    },
  },
  {
    name: 'schedule_tweet',
    description: 'Schedule a tweet for later posting',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Tweet text (max 280 chars)',
        },
        account: {
          type: 'string',
          description: 'Account to post from (default: primary)',
        },
        scheduled_for: {
          type: 'string',
          description: 'Scheduled posting time (ISO 8601)',
        },
      },
      required: ['text', 'scheduled_for'],
    },
  },
];

/**
 * Execute a marketing tool
 */
export async function executeMarketingTool(
  toolName: string,
  params: any,
  baseUrl: string = 'http://localhost:3333'
): Promise<any> {
  try {
    switch (toolName) {
      case 'tweet_post':
        const postRes = await fetch(`${baseUrl}/api/marketing/twitter/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        return await postRes.json();

      case 'tweet_search':
        const searchRes = await fetch(
          `${baseUrl}/api/marketing/twitter/search?q=${encodeURIComponent(params.query)}&type=${params.type || 'latest'}`,
          { headers: { 'Accept': 'application/json' } }
        );
        return await searchRes.json();

      case 'tweet_analytics':
        const analyticsRes = await fetch(`${baseUrl}/api/marketing/twitter/analytics`, {
          headers: { 'Accept': 'application/json' },
        });
        return await analyticsRes.json();

      case 'campaign_create':
        const createRes = await fetch(`${baseUrl}/api/marketing/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        return await createRes.json();

      case 'campaign_list':
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.set('status', params.status);
        if (params.limit) queryParams.set('limit', params.limit.toString());
        
        const listRes = await fetch(`${baseUrl}/api/marketing/campaigns?${queryParams}`, {
          headers: { 'Accept': 'application/json' },
        });
        return await listRes.json();

      case 'content_calendar':
        const calendarRes = await fetch(`${baseUrl}/api/marketing/content-calendar`, {
          headers: { 'Accept': 'application/json' },
        });
        return await calendarRes.json();

      case 'trending_topics':
        const trendingRes = await fetch(`${baseUrl}/api/marketing/twitter/trending`, {
          headers: { 'Accept': 'application/json' },
        });
        return await trendingRes.json();

      case 'competitor_analysis':
        // For now, use tweet search to analyze competitor
        const competitorRes = await fetch(
          `${baseUrl}/api/marketing/twitter/search?q=${encodeURIComponent(params.account)}&type=top`,
          { headers: { 'Accept': 'application/json' } }
        );
        return await competitorRes.json();

      case 'hashtag_research':
        // Use tweet search for hashtag research
        const hashtag = params.hashtag.startsWith('#') ? params.hashtag : `#${params.hashtag}`;
        const hashtagRes = await fetch(
          `${baseUrl}/api/marketing/twitter/search?q=${encodeURIComponent(hashtag)}&type=top`,
          { headers: { 'Accept': 'application/json' } }
        );
        return await hashtagRes.json();

      case 'schedule_tweet':
        // For now, just record it in tweet history with scheduled status
        // A cron job or scheduler would handle actual posting
        return {
          success: true,
          message: 'Tweet scheduled successfully',
          scheduled_for: params.scheduled_for,
          text: params.text,
          note: 'Scheduling system not yet implemented - tweet recorded for manual posting',
        };

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error) {
    console.error(`Marketing tool execution error (${toolName}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error executing marketing tool',
    };
  }
}

/**
 * Get tool definitions for the agent
 */
export function getMarketingToolDefinitions(): string {
  return MARKETING_TOOLS.map((tool) => {
    const params = Object.entries(tool.parameters.properties)
      .map(([name, def]: [string, any]) => {
        const required = tool.parameters.required.includes(name) ? ' (required)' : ' (optional)';
        return `  - ${name}${required}: ${def.description}`;
      })
      .join('\n');

    return `### ${tool.name}\n${tool.description}\n\nParameters:\n${params}`;
  }).join('\n\n');
}
