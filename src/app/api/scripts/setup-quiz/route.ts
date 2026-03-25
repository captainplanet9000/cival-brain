import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST() {
  const sb = getServiceSupabase();

  // Check if quiz framework already exists
  const { data: existing } = await sb.from('script_frameworks').select('id').eq('slug', 'quiz').limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ message: 'Quiz framework already exists', id: existing[0].id });
  }

  const quizFramework = {
    name: 'TikTok Quiz',
    slug: 'quiz',
    description: 'Faceless quiz content for TikTok — speed trivia, riddles, guess-the, would-you-rather, personality quizzes, and multi-level challenges. Optimized for engagement, completion rate, and comment-driving formats.',
    channel: 'quiz_channel',
    framework_type: 'quiz',
    structure: {
      sections: [
        { name: 'HOOK', duration: '2-3s', purpose: 'Attention grab — "Only 5% pass this!" or "Quiz time!"' },
        { name: 'QUESTIONS', duration: '20-45s', purpose: 'Core quiz content — questions with timer + reveal' },
        { name: 'REVEAL', duration: '3-5s', purpose: 'Answer reveal with brief explanation or fun fact' },
        { name: 'CTA', duration: '3-5s', purpose: 'Engagement hook — "Drop your score!" or "Follow for Part 2"' },
      ],
      rules: [
        'Total video: 30-60 seconds max',
        'Clear question → timer → answer reveal pattern',
        'Use "Only X% get this right" hooks',
        'Always include comment CTA',
        'Multiple choice with 3-4 options (A/B/C/D)',
        'Correct answer highlighted on reveal',
        'Background: looping video or static gradient',
        'Text overlays: large, readable, centered',
        'Timer bar or countdown visual',
        'Numbers spelled out in TTS version',
      ],
      categories: [
        'speed_trivia',
        'guess_the',
        'riddles',
        'would_you_rather',
        'personality',
        'multi_level',
        'true_or_false',
        'finish_the_lyric',
      ],
      difficulty_levels: ['easy', 'medium', 'hard', 'expert'],
      format_specs: {
        speed_trivia: {
          questions_per_video: '5-10',
          time_per_question: '3s',
          style: 'Rapid-fire, multiple choice, general knowledge',
          hook: '"How many can you get right in 30 seconds?"',
          viral_examples: ['Guess the Flag', 'Guess the Logo', 'Capital Cities'],
        },
        guess_the: {
          questions_per_video: '5-7',
          time_per_question: '5s',
          style: 'Visual clue → guess → reveal',
          hook: '"Can you guess all 5?"',
          subtypes: ['Guess the Logo', 'Movie from Emojis', 'Country from Clues', 'Song from Intro', 'Celebrity Baby Photo'],
        },
        riddles: {
          questions_per_video: '3-5',
          time_per_question: '5-7s',
          style: 'Logic puzzles, lateral thinking, wordplay',
          hook: '"Only 3% of people get ALL of these right"',
          viral_examples: ['Logic puzzles', 'Word riddles', 'Math tricks', 'Lateral thinking'],
        },
        would_you_rather: {
          questions_per_video: '5-7',
          time_per_question: '5s',
          style: 'Two polarizing options, no right answer',
          hook: '"This one is IMPOSSIBLE to choose"',
          engagement: 'Comment wars drive algorithm',
        },
        personality: {
          questions_per_video: '5-7',
          time_per_question: '5s',
          style: 'Scenario-based choices → personality result',
          hook: '"What does your choice say about you?"',
          result_types: '3-4 personality archetypes at end',
        },
        multi_level: {
          questions_per_video: '5-7',
          time_per_question: 'decreasing (5s→3s→2s)',
          style: 'Progressive difficulty, level-up format',
          hook: '"Let\'s see how far you can get!"',
          engagement: '"If you passed Level 4, you\'re top 5%"',
        },
        true_or_false: {
          questions_per_video: '7-10',
          time_per_question: '3s',
          style: 'Surprising facts presented as T/F',
          hook: '"These facts will BLOW YOUR MIND"',
          viral_examples: ['Science myths', 'History facts', 'Animal facts', 'Food facts'],
        },
        finish_the_lyric: {
          questions_per_video: '5-7',
          time_per_question: '5s',
          style: 'Partial lyrics with blank → reveal',
          hook: '"Only real music fans get 5/5"',
          viral_examples: ['2000s hits', '90s classics', 'Current hits', 'Decade mix'],
        },
      },
    },
    example_prompt: 'Generate a 5-question speed trivia quiz about world geography with medium difficulty',
    config: {
      target_duration: '30-60s',
      word_count: '100-250',
      tts_engine: 'Inworld',
      style: 'faceless',
      aspect_ratio: '9:16',
      text_position: 'center',
    },
  };

  const { data, error } = await sb.from('script_frameworks').insert(quizFramework).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Quiz framework created', data });
}
