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

// ─── Inworld Audio Markup Guide (injected into every prompt) ─────────────────
const INWORLD_TTS_GUIDE = `
=== INWORLD TTS OPTIMIZATION ===
The TTS section will be generated via Inworld TTS-1.5-Max. Apply these markups to maximize audio quality:

EMOTION MARKUPS (place ONE at the very start of the TTS text):
  [happy]      → warm, uplifting delivery (use for motivational / positive content)
  [sad]        → soft, empathetic delivery (use for vulnerability / struggle content)
  [angry]      → intense, urgent delivery (use sparingly for confrontational content)
  [surprised]  → bright, energetic delivery (use for revelations / breakthroughs)
  [whispering] → intimate, close delivery (use for confessional / secret content)

NON-VERBAL VOCALIZATIONS (place anywhere in TTS text, use sparingly):
  [breathe]        → natural breath pause (great between paragraphs)
  [sigh]           → emotional release (use in vulnerability moments)
  [laugh]          → genuine laughter (use in light/ironic moments)
  [clear_throat]   → attention reset (use before key statements)

TTS TEXT RULES:
- Place exactly ONE emotion markup at the very beginning
- Use [breathe] max 2-3 times per script at natural pause points
- Keep sentences 7-14 words for optimal TTS pacing
- Spell out all numbers (forty-two, not 42)
- No special characters: no *, #, /, @, or brackets except Inworld markups
- Write exactly as it should be spoken — no abbreviations
- Em-dashes (—) and ellipses (...) are fine for natural pauses
- Max 2,000 characters per TTS section (the API limit)
`;

function buildSystemPrompt(framework: any): string {
  const { name, framework_type, structure, config, channel } = framework;

  if (framework_type === 'asmpro') {
    return `You are an expert motivational script writer using the ASMPro framework (Monroe's Motivated Sequence + Duarte's Sparkline).

Channel: What I Need to Hear (${channel})
Target: 90-120 second scripts optimized for Inworld TTS-1.5-Max

STRUCTURE (5 sections - non-negotiable):
${(structure.sections || []).map((s: any) => `[${s.name}] (${s.duration}) - ${s.purpose}`).join('\n')}

RULES:
${(structure.rules || []).map((r: string) => `- ${r}`).join('\n')}

ARCHETYPES: ${(structure.archetypes || []).join(', ')}
CATEGORIES: ${(structure.categories || []).join(', ')}

OUTPUT FORMAT:
1. Title & metadata
2. Full production script with section headers [ATTENTION], [NEED], [SATISFACTION], [VISUALIZATION], [ACTION]
3. Inworld TTS version (see TTS optimization guide below)
4. Suno music prompt (92 BPM, instrumental, 5-section structure)
5. Higgsfield video prompt (vertical 9:16, loopable, text-safe center)

SCRIPT RULES:
- Present tense ONLY ("I am" not "I will be")
- 7-14 words per line
- Concrete 3-step plans in Satisfaction
- 2-3 If-Then protocols
- Identity language in Visualization ("I am the person who...")
- No vague fluff, no clichés
- Numbers spelled out for TTS

TTS SECTION FORMAT:
=== INWORLD TTS ===
[happy or sad depending on archetype]
[The clean, spoken TTS text with Inworld markups — no section headers, no formatting]

${INWORLD_TTS_GUIDE}`;
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

=== INWORLD TTS ===
[Choose emotion based on episode mood: happy/sad/surprised/angry/whispering]
[Clean narration text with Inworld audio markups — 150-160 words, no section headers]

=== VISUAL PROMPTS ===
Scene 1-4 descriptions for AI image generation

=== MUSIC PROMPT ===
Suno-compatible music description

=== NEXT EPISODE TEASE ===
One-line preview

${INWORLD_TTS_GUIDE}`;
  }

  // Generic / variety show
  return `You are a script writer for ${name}.
Channel: ${channel}
Type: ${framework_type}

Structure:
${JSON.stringify(structure, null, 2)}

Config: ${JSON.stringify(config || {})}

Generate a complete, production-ready script following this framework exactly.

For the TTS section, output it as:
=== INWORLD TTS ===
[emotion markup]
[clean spoken text with Inworld audio markups]

${INWORLD_TTS_GUIDE}`;
}
