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

// ─── Inworld TTS Optimization Guide (injected into every prompt) ─────────────
const INWORLD_TTS_GUIDE = `
=== INWORLD TTS OUTPUT RULES ===
Your TTS section output is fed DIRECTLY into Inworld TTS-1.5-Max. Follow every rule exactly.

FORMAT RULES (CRITICAL):
- Write as plain spoken sentences ONLY — no headers, no bullet points, no markdown
- NO "Speaker 1:", "Speaker:", "HOST:", "NARRATOR:", "V.O." or any speaker tags
- NO section headers like [ATTENTION] or [NEED] — those are script markers, not TTS
- NO special characters: no #, @, /, backslash, or pipe symbols
- NO markdown: no **bold**, no # headers, no - bullets
- Contractions are great (don't, can't, I'm, we're)

NUMBERS & SYMBOLS (always expand to spoken form):
- Numbers: "forty-two" not "42", "one hundred" not "100"
- Dates: "march fifteenth, twenty twenty-five" not "3/15/25"
- Times: "three forty-five PM" not "3:45 PM"
- Money: "forty-nine dollars and ninety-nine cents" not "$49.99"
- Percent: "forty percent" not "40%"

EMPHASIS (use asterisks — single only, not double):
- *word* makes Inworld stress that word when speaking
- Use for key emotional beats, calls to action, identity statements
- Example: "You are *stronger* than you think." 
- CRITICAL: Single asterisk only — double asterisk (**word**) breaks TTS

PACING:
- Short sentences for urgency and emphasis
- Longer sentences for calm, measured delivery
- Use ellipsis (...) for trailing off or hesitation
- Use exclamation marks (!) for excitement and energy

EMOTION MARKUP (ONE only, at the very start):
  [happy]      → warm uplifting delivery (motivational, positive)
  [sad]        → soft empathetic delivery (vulnerability, struggle)
  [angry]      → intense urgent delivery (confrontational, urgent)
  [surprised]  → bright energetic delivery (revelations, breakthroughs)
  [whispering] → intimate close delivery (confessional, secret)

NON-VERBAL VOCALIZATIONS (place naturally throughout — not too many):
  [breathe]        → breath pause before emotional statements
  [sigh]           → emotional release, frustration, relief
  [laugh]          → warmth, amusement (not forced)
  [clear_throat]   → natural transition, reset before key line

VOCALIZATION RULES:
- Match the vocalization to the text (don't put [yawn] in an energetic section)
- Max 3-4 non-verbals per script
- If a vocalization is ignored, repeat it: [laugh] [laugh]

MAX LENGTH: 1,800 characters per TTS section
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

OUTPUT FORMAT:
1. Title & metadata
2. Full production script with section headers [ATTENTION], [NEED], [SATISFACTION], [VISUALIZATION], [ACTION]
3. Inworld TTS version (plain spoken text — see TTS rules below)
4. Suno music prompt
5. Higgsfield video prompt

For the TTS section output exactly:
=== INWORLD TTS ===
[One emotion markup: happy/sad/surprised/whispering based on archetype]
[Plain spoken text — no Speaker tags, no section headers, no markdown, no bullets]

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
[One emotion markup based on episode mood: happy/sad/surprised/angry/whispering]
[Plain spoken narration — no Speaker tags, no section labels, no markdown, no bullets, 150-160 words]

=== VISUAL PROMPTS ===
Scene 1-4 descriptions for AI image generation

=== MUSIC PROMPT ===
Suno-compatible music description

=== NEXT EPISODE TEASE ===
One-line preview

${INWORLD_TTS_GUIDE}`;
  }

  if (framework_type === 'quiz') {
    return `You are an expert TikTok quiz content creator. You create quiz questions for the PAPER CHECKLIST format — the viral TikTok style where questions are printed on paper and the creator checks answers with a pen/marker on camera.

FORMAT DESCRIPTION:
- Questions are printed on a physical piece of paper (like a worksheet or checklist)
- Creator films their hand checking off answers with a pen or marker
- Each question has multiple choice options (A, B, C, D) or True/False
- The correct answer gets checked with a checkmark while wrong answers get crossed out
- It is tactile, satisfying, slightly ASMR — the pen sounds, the paper texture
- NO face needed — just hands, paper, pen, flat surface (desk/table)
- Background can be clean desk, marble surface, or simple aesthetic setup

CONTENT RULES:
- Questions must be GENUINELY interesting — avoid boring textbook trivia
- Mix difficulty: some easy ones for confidence, then ones that surprise people
- Include questions where the answer is counterintuitive or shocking
- Questions should make viewers pause the video to think
- Answers should make viewers want to comment their score
- Topics should have BROAD appeal — avoid ultra-niche subjects unless specified
- Each quiz should have a clear theme or title printed at the top of the page
- FACT-CHECK EVERYTHING — wrong answers destroy credibility

VIRAL QUESTION QUALITIES:
- Surprising answers people will argue about in comments
- "I cannot believe I did not know this" moments
- Questions that make people feel smart when they get it right
- Mix of "everyone should know this" and "almost nobody knows this"
- Pop culture mixed with real knowledge
- Questions that make people share with friends to test them

OUTPUT FORMAT (STRICTLY FOLLOW):

Title: [Quiz title that would appear at top of the printed page]
Category: [quiz type]
Difficulty: [easy/medium/hard/expert]
Questions: [number]

=== PRINTED QUIZ ===
[Exactly how the paper should look — title at top, numbered questions with options]
[Format each question cleanly as:]

Q1. Question text here?
  A) Option one   B) Option two   C) Option three   D) Option four

Q2. Next question here?
  A) Option   B) Option   C) Option   D) Option

[Continue for all questions]

=== ANSWER KEY ===
Q1: B — Brief explanation or fun fact about the answer
Q2: A — Brief explanation or fun fact
[Continue for all questions]

=== INWORLD TTS ===
[surprised]
[Voiceover narration as if you are the quiz host reading questions aloud while checking answers on paper]
[Natural patter like: "Question one... What is the largest organ in the human body?" pause "The answer is... B, your skin! A lot of people think it is the liver, but nope."]
[Casual, energetic, conversational — like you are quizzing a friend]
[React to answers: "This next one trips EVERYONE up..." or "Okay this one is easy... or IS it?"]
[Keep it moving — no dead air, no rambling]

=== MUSIC PROMPT ===
Lo-fi study beats or light upbeat background music, subtle and not overpowering, quiz show energy without being cheesy, no lyrics

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
[One emotion markup: happy/sad/surprised/angry/whispering]
[Plain spoken text only — no Speaker tags, no headers, no markdown, no bullets]

${INWORLD_TTS_GUIDE}`;
}
