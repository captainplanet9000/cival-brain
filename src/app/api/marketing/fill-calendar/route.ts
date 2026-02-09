import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const TASK_TEMPLATES: Record<string, Array<{ task_name: string; skill_required: string; tool: string; sort_order: number }>> = {
  tiktok: [
    { task_name: 'Write script', skill_required: 'copywriting', tool: 'manual', sort_order: 0 },
    { task_name: 'Generate video in Higgsfield', skill_required: 'video_gen', tool: 'higgsfield', sort_order: 1 },
    { task_name: 'Edit video', skill_required: 'editing', tool: 'davinci_resolve', sort_order: 2 },
    { task_name: 'Add captions', skill_required: 'editing', tool: 'capcut', sort_order: 3 },
    { task_name: 'Create thumbnail', skill_required: 'design', tool: 'canva', sort_order: 4 },
    { task_name: 'Schedule post', skill_required: 'posting', tool: 'manual', sort_order: 5 },
    { task_name: 'Publish', skill_required: 'posting', tool: 'manual', sort_order: 6 },
  ],
  tweet: [
    { task_name: 'Write copy', skill_required: 'copywriting', tool: 'manual', sort_order: 0 },
    { task_name: 'Create graphic', skill_required: 'design', tool: 'canva', sort_order: 1 },
    { task_name: 'Schedule post', skill_required: 'posting', tool: 'manual', sort_order: 2 },
    { task_name: 'Publish', skill_required: 'posting', tool: 'manual', sort_order: 3 },
  ],
  instagram: [
    { task_name: 'Write caption', skill_required: 'copywriting', tool: 'manual', sort_order: 0 },
    { task_name: 'Create visual', skill_required: 'design', tool: 'canva', sort_order: 1 },
    { task_name: 'Add hashtags', skill_required: 'copywriting', tool: 'manual', sort_order: 2 },
    { task_name: 'Schedule', skill_required: 'posting', tool: 'manual', sort_order: 3 },
    { task_name: 'Publish', skill_required: 'posting', tool: 'manual', sort_order: 4 },
  ],
  youtube: [
    { task_name: 'Write script', skill_required: 'copywriting', tool: 'manual', sort_order: 0 },
    { task_name: 'Record/Generate video', skill_required: 'video_gen', tool: 'higgsfield', sort_order: 1 },
    { task_name: 'Edit video', skill_required: 'editing', tool: 'davinci_resolve', sort_order: 2 },
    { task_name: 'Create thumbnail', skill_required: 'design', tool: 'canva', sort_order: 3 },
    { task_name: 'SEO & Tags', skill_required: 'copywriting', tool: 'manual', sort_order: 4 },
    { task_name: 'Upload', skill_required: 'posting', tool: 'manual', sort_order: 5 },
    { task_name: 'Publish', skill_required: 'posting', tool: 'manual', sort_order: 6 },
  ],
};

// Distribution: 5 videos/day across TikTok channels
const DAILY_DISTRIBUTION = [
  { channelName: 'Honey Bunny', platform: 'tiktok', count: 1 },
  { channelName: 'Clay Verse', platform: 'tiktok', count: 1 },
  { channelName: 'Hunni Bunni Kitchen', platform: 'tiktok', count: 1 },
  { channelName: 'What I Need to Hear', platform: 'tiktok', count: 1 },
  { channelName: 'GWDS TikTok 1', platform: 'tiktok', count: 1 },
];

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { weekStart } = body; // ISO date string for Monday of target week

  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 });

  // Get channels with their business units
  const { data: channels } = await sb.from('marketing_channels').select('id, name, platform, business_unit_id');
  if (!channels) return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });

  const channelMap: Record<string, typeof channels[0]> = {};
  for (const ch of channels) channelMap[ch.name] = ch;

  // Check existing content for this week to avoid duplicates
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  
  const { data: existing } = await sb.from('marketing_content')
    .select('id, scheduled_for')
    .gte('scheduled_for', start.toISOString())
    .lt('scheduled_for', end.toISOString());
  
  const existingCount = existing?.length || 0;

  const createdJobs: string[] = [];
  
  // For each day Mon-Sun
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = new Date(start);
    day.setDate(day.getDate() + dayOffset);
    
    for (const dist of DAILY_DISTRIBUTION) {
      const ch = channelMap[dist.channelName + ' TikTok'] || channelMap[dist.channelName];
      if (!ch) continue;
      
      for (let n = 0; n < dist.count; n++) {
        // Schedule at 10am + staggered
        const scheduledFor = new Date(day);
        scheduledFor.setHours(10 + n * 2, 0, 0, 0);
        
        const title = `${dist.channelName} - ${day.toLocaleDateString('en-US', { weekday: 'short' })} Video ${n + 1}`;
        
        // Create content item
        const { data: content, error: cErr } = await sb.from('marketing_content').insert({
          title,
          content_type: 'tiktok',
          platform: ch.platform,
          status: 'idea',
          business_unit_id: ch.business_unit_id,
          scheduled_for: scheduledFor.toISOString(),
        }).select().single();
        
        if (cErr || !content) continue;
        createdJobs.push(content.id);
        
        // Create tasks from template
        const template = TASK_TEMPLATES[ch.platform] || TASK_TEMPLATES.tiktok;
        const tasks = template.map(t => ({
          content_id: content.id,
          ...t,
          assigned_to: 'unassigned',
          status: 'todo',
        }));
        
        await sb.from('marketing_job_tasks').insert(tasks);
      }
    }
  }

  return NextResponse.json({ 
    created: createdJobs.length, 
    existingThisWeek: existingCount,
    totalThisWeek: existingCount + createdJobs.length,
  });
}

// templates used internally
