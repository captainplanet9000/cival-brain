import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getServiceSupabase();
  
  const [contentRes, channelsRes, campaignsRes, perfRes] = await Promise.all([
    sb.from('marketing_content').select('id, status, platform, published_at, scheduled_for, created_at'),
    sb.from('marketing_channels').select('id, status'),
    sb.from('marketing_campaigns').select('id, status'),
    sb.from('marketing_performance').select('views, likes, comments, shares, saves, revenue'),
  ]);

  const content = contentRes.data || [];
  const channels = channelsRes.data || [];
  const campaigns = campaignsRes.data || [];
  const perf = perfRes.data || [];

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const publishedThisWeek = content.filter(c => c.published_at && new Date(c.published_at) >= weekAgo).length;
  const scheduled = content.filter(c => c.status === 'scheduled').length;
  const activeChannels = channels.filter(c => c.status === 'active').length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  const totalViews = perf.reduce((s, p) => s + (p.views || 0), 0);
  const totalEngagement = perf.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0), 0);
  const totalRevenue = perf.reduce((s, p) => s + parseFloat(p.revenue || '0'), 0);

  // Content by status
  const byStatus: Record<string, number> = {};
  for (const c of content) byStatus[c.status] = (byStatus[c.status] || 0) + 1;

  // Content by platform
  const byPlatform: Record<string, number> = {};
  for (const c of content) byPlatform[c.platform] = (byPlatform[c.platform] || 0) + 1;

  return NextResponse.json({
    totalContent: content.length,
    publishedThisWeek,
    scheduled,
    activeChannels,
    activeCampaigns,
    totalViews,
    totalEngagement,
    totalRevenue,
    byStatus,
    byPlatform,
  });
}
