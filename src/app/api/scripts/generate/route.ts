import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'https://desktop-2948l01.taile3b948.ts.net';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  const body = await req.json();
  const { framework_id, prompt, generation_params } = body;

  if (!framework_id || !prompt) {
    return NextResponse.json({ error: 'framework_id and prompt required' }, { status: 400 });
  }

  // Get framework
  const { data: framework, error: fErr } = await sb.from('script_frameworks').select('*').eq('id', framework_id).single();
  if (fErr || !framework) {
    return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
  }

  // Build system prompt from framework
  const systemPrompt = buildSystemPrompt(framework);

  try {
    const res = await fetch(GATEWAY_URL + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `AI generation failed: ${errText}` }, { status: 502 });
    }

    const result = await res.json();
    const content = result.choices?.[0]?.message?.content || '';

    // Log generation
    const { data: genRecord } = await sb.from('script_generations').insert({
      framework_id,
      prompt,
      model: 'openclaw',
      generation_params: generation_params || {},
    }).select().single();

    return NextResponse.json({
      content,
      generation_id: genRecord?.id,
      framework: { name: framework.name, slug: framework.slug },
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Generation error: ${err.message}` }, { status: 500 });
  }
}

function buildSystemPrompt(framework: any): string {
  const { name, framework_type, structure, config, channel } = framework;

  if (framework_type === 'asmpro') {
    return `You are an expert motivational script writer using the ASMPro framework (Monroe's Motivated Sequence + Duarte's Sparkline).

Channel: What I Need to Hear (${channel})
Target: 90-120 second scripts optimized for VibeVoice TTS

STRUCTURE (5 sections - non-negotiable):
${(structure.sections || []).map((s: any) => `[${s.name}] (${s.duration}) - ${s.purpose}`).join('\n')}

RULES:
${(structure.rules || []).map((r: string) => `- ${r}`).join('\n')}

ARCHETYPES: ${(structure.archetypes || []).join(', ')}
CATEGORIES: ${(structure.categories || []).join(', ')}

OUTPUT FORMAT:
1. Title & metadata
2. Full production script with section headers [ATTENTION], [NEED], [SATISFACTION], [VISUALIZATION], [ACTION]
3. Clean TTS version (Speaker 1: format, 7-14 words per line, present tense)
4. Suno music prompt (92 BPM, instrumental, 5-section structure)
5. Higgsfield video prompt (vertical 9:16, loopable, text-safe center)

STRICT RULES:
- Present tense ONLY ("I am" not "I will be")
- 7-14 words per line
- Concrete 3-step plans in Satisfaction
- 2-3 If-Then protocols
- Identity language in Visualization ("I am the person who...")
- No vague fluff, no clichés
- Numbers spelled out for TTS`;
  }

  if (framework_type === 'tension') {
    return `You are an expert fiction writer for short-form TikTok series using the TENSION framework.

Channel: Clay Verse (${channel})
Target: 5-part series, 60 seconds per episode, 150-160 words each

TENSION STRUCTURE (per episode):
${(structure.sections || []).map((s: any) => `[${s.name}] (${s.duration}) - ${s.purpose}`).join('\n')}

GENRES: ${(structure.genres || []).join(', ')}
NARRATOR STYLES: ${(structure.narrator_styles || []).join(', ')}
SERIES ARC: ${(structure.series_structure || []).join(' → ')}

RULES:
${(structure.rules || []).map((r: string) => `- ${r}`).join('\n')}

OUTPUT FORMAT per episode:
=== STORY SCRIPT ===
Series: [Title]
Episode: [X of 5]
Genre: [Genre]
Duration: 60 seconds
Word Count: [150-160]

=== EPISODE SCRIPT ===
[TEASE - 0:05] ...
[ESTABLISH - 0:10] ...
[NAVIGATE - 0:25] ...
[SHIFT - 0:10] ...
[IMPACT - 0:05] ...
[OPEN - 0:05] ...

=== VISUAL PROMPTS ===
Scene 1-4 descriptions for AI image generation

=== MUSIC PROMPT ===
Suno-compatible music description

=== NEXT EPISODE TEASE ===
One-line preview`;
  }

  // Generic / variety show
  return `You are a script writer for ${name}.
Channel: ${channel}
Type: ${framework_type}

Structure:
${JSON.stringify(structure, null, 2)}

Config: ${JSON.stringify(config || {})}

Generate a complete, production-ready script following this framework exactly.`;
}
