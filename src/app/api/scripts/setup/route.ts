import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST() {
  const sb = getServiceSupabase();

  // Create tables via raw SQL using supabase rpc or direct queries
  // Since we can't run raw SQL directly, we'll use the REST API approach
  // Tables should be created via Supabase dashboard or migration
  // For now, seed the frameworks

  // Check if frameworks already exist
  const { data: existing } = await sb.from('script_frameworks').select('id').limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ message: 'Already seeded', count: existing.length });
  }

  const frameworks = [
    {
      name: 'ASMPro Script Framework',
      slug: 'asmpro',
      description: 'Monroe\'s Motivated Sequence + Duarte\'s Sparkline for motivational/affirmation TikTok content. 5-section structure optimized for VibeVoice TTS.',
      channel: 'what_i_need_to_hear',
      framework_type: 'asmpro',
      structure: {
        sections: [
          { name: 'ATTENTION', duration: '20-30s', purpose: 'Breath cue + Hook + Promise' },
          { name: 'NEED', duration: '20-30s', purpose: 'Problem naming + Root cause + Cost of inaction' },
          { name: 'SATISFACTION', duration: '40-50s', purpose: '3-step plan + If-Then protocols + Examples' },
          { name: 'VISUALIZATION', duration: '15-20s', purpose: 'Sensory scene + Identity language + Emotional anchor' },
          { name: 'ACTION', duration: '10-15s', purpose: 'Immediate next step + Empowerment close' },
        ],
        rules: [
          'Present tense throughout',
          '7-14 words per line',
          'Identity language: "I am the person who..."',
          'If-Then protocols required',
          'Concrete 3-step plans',
          'No future tense, no vague fluff',
        ],
        archetypes: ['calm_mentor', 'executive_gravitas', 'gentle_compassion', 'focus_scientist', 'urgency_coach', 'high_performance'],
        categories: ['pre_interview', 'pre_test', 'performance', 'mental_clarity', 'self_belief'],
      },
      example_prompt: 'Generate a pre-interview confidence script using executive_gravitas archetype for salary negotiation',
      config: { target_duration: '90-120s', word_count: '225-300', tts_engine: 'VibeVoice', music_bpm: 92 },
    },
    {
      name: 'Story Script Framework',
      slug: 'tension',
      description: 'TENSION structure for fiction entertainment TikTok. 5-part series, 60s episodes, 150-160 words each. 7 genres from zombie to psychological thriller.',
      channel: 'clay_verse',
      framework_type: 'tension',
      structure: {
        sections: [
          { name: 'TEASE', duration: '0:00-0:05', purpose: 'Cold open hook - action/danger' },
          { name: 'ESTABLISH', duration: '0:05-0:15', purpose: 'Context - who, where, stakes' },
          { name: 'NAVIGATE', duration: '0:15-0:40', purpose: 'Rising action - obstacles, conflict' },
          { name: 'SHIFT', duration: '0:40-0:50', purpose: 'Turn/twist - revelation, escalation' },
          { name: 'IMPACT', duration: '0:50-0:55', purpose: 'Emotional beat - consequence' },
          { name: 'OPEN', duration: '0:55-0:60', purpose: 'Cliffhanger - hook for next episode' },
        ],
        rules: [
          '150-160 words per episode',
          '5-part series arc',
          'CAPITALIZE key words for emphasis',
          'Ellipses for dramatic pauses',
          'Cliffhanger every episode',
          'TTS-friendly formatting',
        ],
        genres: ['zombie', 'alien', 'heist', 'supernatural', 'mystery', 'survival', 'psychological'],
        narrator_styles: ['survivor', 'witness', 'noir', 'haunted', 'tactical', 'intimate'],
        series_structure: ['Setup', 'Escalation', 'Crisis', 'Push', 'Resolution'],
      },
      example_prompt: 'Generate a 5-part zombie survival series set in an abandoned hospital',
      config: { target_duration: '60s', word_count: '150-160', episodes_per_series: 5, tts_engine: 'ElevenLabs' },
    },
    {
      name: 'Claymation Variety Show',
      slug: 'claymation',
      description: 'Robot Chicken-style variety show with skits, character libraries, and production pipeline for claymation content.',
      channel: 'claymation',
      framework_type: 'variety_show',
      structure: {
        sections: [
          { name: 'COLD_OPEN', duration: '5-10s', purpose: 'Quick absurd hook' },
          { name: 'SETUP', duration: '10-15s', purpose: 'Establish premise and characters' },
          { name: 'ESCALATION', duration: '15-20s', purpose: 'Comedy builds, things go wrong' },
          { name: 'PUNCHLINE', duration: '5-10s', purpose: 'Payoff / subversion' },
          { name: 'TAG', duration: '3-5s', purpose: 'Final joke / stinger' },
        ],
        rules: [
          'Max 45 seconds per skit',
          'Visual comedy first, dialogue second',
          'Absurdist humor encouraged',
          'Clay aesthetic descriptions required',
        ],
        skit_types: ['parody', 'original', 'mashup', 'commercial_spoof', 'musical_number'],
      },
      example_prompt: 'Generate a claymation skit parodying a cooking show where the food fights back',
      config: { target_duration: '30-45s', style: 'robot_chicken' },
    },
  ];

  const { data, error } = await sb.from('script_frameworks').insert(frameworks).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Seeded frameworks', data });
}
