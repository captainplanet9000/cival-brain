// Mass Script Generator - Generates hundreds of scripts via OpenClaw API and inserts into Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vusjcfushwxwksfuszjv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ';
const GATEWAY_URL = 'https://desktop-2948l01.taile3b948.ts.net';
const GATEWAY_TOKEN = '6cd281e2cc11b39fecb53a2205fe94d8f2dc04fc2900c5f1';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Utility ───
async function aiGenerate(systemPrompt, userPrompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(GATEWAY_URL + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4-20250514',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4000,
        }),
      });
      if (!res.ok) { console.error(`AI error ${res.status}: ${await res.text()}`); continue; }
      const j = await res.json();
      return j.choices?.[0]?.message?.content || '';
    } catch (e) { console.error(`Attempt ${i+1} failed:`, e.message); await sleep(5000); }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseJsonFromAI(text) {
  // Extract JSON from markdown code blocks or raw
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1].trim() : text.trim();
  try { return JSON.parse(raw); } catch { return null; }
}

async function insertScript(script) {
  const wc = (script.script_content || '').split(/\s+/).filter(Boolean).length;
  const record = {
    ...script,
    word_count: script.word_count || wc,
    estimated_duration_secs: script.estimated_duration_secs || Math.round(wc / 2.5),
    status: 'draft',
  };
  const { data, error } = await sb.from('scripts').insert(record).select('id, title').single();
  if (error) { console.error('Insert error:', error.message, 'Title:', script.title); return null; }
  return data;
}

// ─── Get framework IDs ───
async function getFrameworks() {
  const { data } = await sb.from('script_frameworks').select('id, slug');
  const map = {};
  for (const f of data || []) map[f.slug] = f.id;
  return map;
}

// ─── Hunni Bunni Framework ───
async function ensureHunniBunniFramework() {
  const { data: existing } = await sb.from('script_frameworks').select('id').eq('slug', 'hunnibunni').single();
  if (existing) return existing.id;

  const framework = {
    name: 'Hunni Bunni Kitchen',
    slug: 'hunnibunni',
    description: 'Kid-friendly cooking show hosted by adorable bunny character in a cozy 3D animated kitchen. Recipes made fun with cute animations and simple steps.',
    channel: 'hunni_bunni_kitchen',
    framework_type: 'cooking_show',
    structure: {
      sections: [
        { name: 'GREETING', duration: '5-10s', purpose: 'Hunni Bunni welcomes viewers, introduces recipe' },
        { name: 'INGREDIENTS', duration: '10-15s', purpose: 'Show all ingredients with cute descriptions' },
        { name: 'COOKING_STEPS', duration: '30-40s', purpose: 'Step-by-step cooking with tips and fun facts' },
        { name: 'PRESENTATION', duration: '10-15s', purpose: 'Final dish reveal, plating tips' },
        { name: 'SIGN_OFF', duration: '5s', purpose: 'Hunni Bunni says goodbye, teases next recipe' },
      ],
      rules: [
        'Kid-friendly language throughout',
        'Simple vocabulary, short sentences',
        'Fun food facts and cooking tips',
        'Safety reminders for hot/sharp items',
        'Cute bunny puns encouraged',
        'Each recipe must be achievable by beginners',
      ],
      categories: ['breakfast', 'lunch', 'dinner', 'desserts', 'snacks', 'drinks'],
    },
    example_prompt: 'Generate a breakfast recipe script for fluffy pancakes with a berry topping',
    config: { target_duration: '60-90s', style: '3d_animation', character: 'Hunni Bunni' },
  };

  const { data, error } = await sb.from('script_frameworks').insert(framework).select('id').single();
  if (error) { console.error('Framework insert error:', error.message); return null; }
  return data.id;
}

// ─── ASMPRO Generation ───
const ASMPRO_SYSTEM = `You are an expert motivational script writer using Monroe's Motivated Sequence.
Generate a COMPLETE production-ready script. Return ONLY valid JSON with these exact fields:
{
  "title": "string",
  "category": "one of: pre_interview, pre_test, performance, mental_clarity, self_belief",
  "series_name": "What I Need to Hear",
  "episode_number": null,
  "script_content": "Full script with [ATTENTION], [NEED], [SATISFACTION], [VISUALIZATION], [ACTION] section headers. 225-300 words. Present tense. Identity language. 7-14 words per line. Include audio tags like [thoughtful], [confident], etc.",
  "tts_content": "Clean TTS version without section headers. Speaker 1: format. No audio tags, no formatting marks.",
  "music_prompt": "Suno-compatible: Cinematic instrumental, specific instruments, 92 BPM, instrumental only, no vocals. Include structure details.",
  "video_prompt": "Higgsfield-compatible: Visual scene description, vertical 9:16, slow camera movement, no text/logos/faces/people. Warm palette.",
  "visual_prompts": ["Scene 1 image prompt", "Scene 2 image prompt", "Scene 3 image prompt"],
  "sound_effects": ["Soft ambient pad", "Gentle transition whoosh", "Warm resonant tone"],
  "tags": ["tag1", "tag2", "tag3"],
  "word_count": 250,
  "estimated_duration_secs": 100
}

RULES:
- Present tense: "I am ready" not "I will be ready"
- Identity language: "I am the person who..."
- 7-14 words per line max
- Concrete 3-step plans in SATISFACTION
- If-Then protocols required
- Sensory details in VISUALIZATION
- No clichés, no vague fluff
- Each script MUST be unique in topic and approach`;

const ASMPRO_TOPICS = {
  pre_interview: [
    { topic: 'salary negotiation confidence', archetype: 'executive_gravitas' },
    { topic: 'panel interview composure', archetype: 'calm_mentor' },
    { topic: 'technical interview clarity', archetype: 'focus_scientist' },
    { topic: 'first impression mastery', archetype: 'high_performance' },
    { topic: 'career pivot interview', archetype: 'gentle_compassion' },
    { topic: 'executive leadership interview', archetype: 'executive_gravitas' },
    { topic: 'remote video interview presence', archetype: 'focus_scientist' },
    { topic: 'behavioral question preparation', archetype: 'calm_mentor' },
    { topic: 'startup culture fit interview', archetype: 'urgency_coach' },
    { topic: 'second round callback confidence', archetype: 'high_performance' },
    { topic: 'overcoming interview anxiety', archetype: 'gentle_compassion' },
    { topic: 'group interview dynamics', archetype: 'executive_gravitas' },
    { topic: 'internal promotion interview', archetype: 'calm_mentor' },
    { topic: 'creative portfolio presentation', archetype: 'focus_scientist' },
    { topic: 'handling tough questions gracefully', archetype: 'high_performance' },
    { topic: 'post-rejection comeback interview', archetype: 'urgency_coach' },
    { topic: 'case study interview preparation', archetype: 'focus_scientist' },
    { topic: 'cross-cultural interview confidence', archetype: 'gentle_compassion' },
    { topic: 'final round closing strong', archetype: 'executive_gravitas' },
    { topic: 'phone screen first impression', archetype: 'calm_mentor' },
    { topic: 'demonstrating leadership experience', archetype: 'high_performance' },
    { topic: 'answering weakness questions authentically', archetype: 'gentle_compassion' },
    { topic: 'negotiating benefits package', archetype: 'executive_gravitas' },
    { topic: 'medical school interview composure', archetype: 'focus_scientist' },
    { topic: 'law firm partner interview', archetype: 'executive_gravitas' },
    { topic: 'handling silence after your answer', archetype: 'calm_mentor' },
    { topic: 'virtual assessment center readiness', archetype: 'high_performance' },
    { topic: 'consulting case interview mastery', archetype: 'focus_scientist' },
    { topic: 'teaching demonstration interview', archetype: 'gentle_compassion' },
    { topic: 'military to civilian career interview', archetype: 'urgency_coach' },
  ],
  pre_test: [
    { topic: 'final exam focus', archetype: 'focus_scientist' },
    { topic: 'standardized test calm', archetype: 'calm_mentor' },
    { topic: 'certification exam readiness', archetype: 'high_performance' },
    { topic: 'board exam confidence', archetype: 'executive_gravitas' },
    { topic: 'driving test composure', archetype: 'gentle_compassion' },
    { topic: 'licensing exam mastery', archetype: 'focus_scientist' },
    { topic: 'GRE preparation calm', archetype: 'calm_mentor' },
    { topic: 'bar exam mental strength', archetype: 'urgency_coach' },
    { topic: 'medical boards clarity', archetype: 'focus_scientist' },
    { topic: 'math test anxiety release', archetype: 'gentle_compassion' },
    { topic: 'oral examination presence', archetype: 'executive_gravitas' },
    { topic: 'midterm sprint focus', archetype: 'high_performance' },
    { topic: 'language proficiency test', archetype: 'calm_mentor' },
    { topic: 'physical fitness test preparation', archetype: 'urgency_coach' },
    { topic: 'thesis defense readiness', archetype: 'executive_gravitas' },
    { topic: 'AP exam concentration', archetype: 'focus_scientist' },
    { topic: 'MCAT mental endurance', archetype: 'high_performance' },
    { topic: 'CPA exam persistence', archetype: 'urgency_coach' },
    { topic: 'pilot certification calm', archetype: 'calm_mentor' },
    { topic: 'nursing board confidence', archetype: 'gentle_compassion' },
    { topic: 'real estate exam clarity', archetype: 'focus_scientist' },
    { topic: 'LSAT logical thinking', archetype: 'focus_scientist' },
    { topic: 'music performance exam', archetype: 'gentle_compassion' },
    { topic: 'coding assessment readiness', archetype: 'high_performance' },
    { topic: 'SAT test day preparation', archetype: 'calm_mentor' },
  ],
  performance: [
    { topic: 'public speaking stage presence', archetype: 'executive_gravitas' },
    { topic: 'athletic competition peak state', archetype: 'high_performance' },
    { topic: 'musical performance flow', archetype: 'gentle_compassion' },
    { topic: 'sales presentation closing', archetype: 'urgency_coach' },
    { topic: 'creative performance authenticity', archetype: 'calm_mentor' },
    { topic: 'keynote speech delivery', archetype: 'executive_gravitas' },
    { topic: 'marathon race day mindset', archetype: 'high_performance' },
    { topic: 'stand-up comedy debut', archetype: 'calm_mentor' },
    { topic: 'courtroom argument presence', archetype: 'executive_gravitas' },
    { topic: 'dance recital confidence', archetype: 'gentle_compassion' },
    { topic: 'startup pitch to investors', archetype: 'urgency_coach' },
    { topic: 'surgical precision focus', archetype: 'focus_scientist' },
    { topic: 'teaching first day of class', archetype: 'calm_mentor' },
    { topic: 'debate tournament readiness', archetype: 'focus_scientist' },
    { topic: 'powerlifting competition intensity', archetype: 'high_performance' },
    { topic: 'wedding toast delivery', archetype: 'gentle_compassion' },
    { topic: 'board room quarterly review', archetype: 'executive_gravitas' },
    { topic: 'live streaming presence', archetype: 'calm_mentor' },
    { topic: 'martial arts tournament focus', archetype: 'urgency_coach' },
    { topic: 'scientific conference presentation', archetype: 'focus_scientist' },
    { topic: 'job training demonstration', archetype: 'high_performance' },
    { topic: 'theater audition commitment', archetype: 'gentle_compassion' },
    { topic: 'podcast recording flow', archetype: 'calm_mentor' },
    { topic: 'Olympic qualifying intensity', archetype: 'high_performance' },
    { topic: 'TED talk delivery mastery', archetype: 'executive_gravitas' },
    { topic: 'chess tournament concentration', archetype: 'focus_scientist' },
    { topic: 'cooking competition under pressure', archetype: 'urgency_coach' },
    { topic: 'photography exhibition opening', archetype: 'gentle_compassion' },
    { topic: 'sprint race explosive start', archetype: 'high_performance' },
    { topic: 'client presentation confidence', archetype: 'executive_gravitas' },
  ],
  mental_clarity: [
    { topic: 'morning mental reset', archetype: 'calm_mentor' },
    { topic: 'decision fatigue recovery', archetype: 'focus_scientist' },
    { topic: 'information overload clearing', archetype: 'gentle_compassion' },
    { topic: 'creative block breakthrough', archetype: 'urgency_coach' },
    { topic: 'post-conflict emotional reset', archetype: 'calm_mentor' },
    { topic: 'focus after distraction', archetype: 'focus_scientist' },
    { topic: 'overwhelm to clarity transition', archetype: 'gentle_compassion' },
    { topic: 'late night productivity focus', archetype: 'high_performance' },
    { topic: 'anxiety to action conversion', archetype: 'urgency_coach' },
    { topic: 'grief processing clarity', archetype: 'gentle_compassion' },
    { topic: 'post-breakup mental reset', archetype: 'calm_mentor' },
    { topic: 'financial stress clear thinking', archetype: 'focus_scientist' },
    { topic: 'burnout recovery reset', archetype: 'gentle_compassion' },
    { topic: 'Monday morning activation', archetype: 'high_performance' },
    { topic: 'mid-afternoon energy reset', archetype: 'focus_scientist' },
    { topic: 'social media detox focus', archetype: 'calm_mentor' },
    { topic: 'parent brain multitask clarity', archetype: 'urgency_coach' },
    { topic: 'post-travel jet lag recovery', archetype: 'gentle_compassion' },
    { topic: 'deadline pressure clarity', archetype: 'high_performance' },
    { topic: 'rumination pattern breaking', archetype: 'focus_scientist' },
    { topic: 'seasonal depression lifting', archetype: 'gentle_compassion' },
    { topic: 'career crossroads clarity', archetype: 'calm_mentor' },
    { topic: 'comparison trap escape', archetype: 'urgency_coach' },
    { topic: 'perfectionism release', archetype: 'gentle_compassion' },
    { topic: 'post-argument composure', archetype: 'calm_mentor' },
    { topic: 'analysis paralysis breakthrough', archetype: 'focus_scientist' },
    { topic: 'chronic pain focus through', archetype: 'high_performance' },
    { topic: 'new city adjustment clarity', archetype: 'gentle_compassion' },
    { topic: 'imposter syndrome dissolving', archetype: 'executive_gravitas' },
    { topic: 'Sunday evening anxiety clearing', archetype: 'calm_mentor' },
  ],
  self_belief: [
    { topic: 'starting a business fearlessly', archetype: 'urgency_coach' },
    { topic: 'returning to education as an adult', archetype: 'gentle_compassion' },
    { topic: 'overcoming childhood criticism', archetype: 'calm_mentor' },
    { topic: 'first generation college student', archetype: 'high_performance' },
    { topic: 'rebuilding after failure', archetype: 'executive_gravitas' },
    { topic: 'artistic identity claim', archetype: 'gentle_compassion' },
    { topic: 'leadership identity activation', archetype: 'executive_gravitas' },
    { topic: 'body confidence reclamation', archetype: 'gentle_compassion' },
    { topic: 'setting boundaries with family', archetype: 'calm_mentor' },
    { topic: 'speaking up in meetings', archetype: 'urgency_coach' },
    { topic: 'deserving success permission', archetype: 'calm_mentor' },
    { topic: 'aging with power and grace', archetype: 'executive_gravitas' },
    { topic: 'solo travel courage', archetype: 'urgency_coach' },
    { topic: 'leaving toxic relationship', archetype: 'gentle_compassion' },
    { topic: 'immigrant success identity', archetype: 'high_performance' },
    { topic: 'creative career legitimacy', archetype: 'calm_mentor' },
    { topic: 'disability does not define limits', archetype: 'high_performance' },
    { topic: 'single parent strength', archetype: 'gentle_compassion' },
    { topic: 'recovering addict new identity', archetype: 'calm_mentor' },
    { topic: 'career change at forty', archetype: 'executive_gravitas' },
    { topic: 'introvert leadership power', archetype: 'focus_scientist' },
    { topic: 'first time homebuyer confidence', archetype: 'calm_mentor' },
    { topic: 'asking for the raise', archetype: 'urgency_coach' },
    { topic: 'publishing your first book', archetype: 'gentle_compassion' },
    { topic: 'running for office courage', archetype: 'executive_gravitas' },
    { topic: 'standing alone in your truth', archetype: 'high_performance' },
    { topic: 'second chance after prison', archetype: 'gentle_compassion' },
    { topic: 'trusting yourself after betrayal', archetype: 'calm_mentor' },
    { topic: 'athlete comeback after injury', archetype: 'high_performance' },
    { topic: 'quiet confidence in loud rooms', archetype: 'focus_scientist' },
    { topic: 'choosing yourself over pleasing others', archetype: 'urgency_coach' },
    { topic: 'embracing your unique voice', archetype: 'gentle_compassion' },
    { topic: 'walking away from safe career', archetype: 'executive_gravitas' },
    { topic: 'loving your reflection again', archetype: 'gentle_compassion' },
    { topic: 'becoming the parent you needed', archetype: 'calm_mentor' },
  ],
};

// ─── Clay Verse Generation ───
const TENSION_SYSTEM = `You are an expert fiction writer for short-form TikTok series using the TENSION structure.
Generate a COMPLETE 5-part series. Return ONLY valid JSON — an array of 5 episode objects:
[{
  "title": "Series Name - Part X",
  "category": "genre (zombie/alien/heist/supernatural/mystery/survival/psychological)",
  "series_name": "Unique Series Name",
  "episode_number": 1-5,
  "script_content": "Full script with [TEASE], [ESTABLISH], [NAVIGATE], [SHIFT], [IMPACT], [OPEN] section headers. 150-160 words. Short punchy sentences. CAPITALIZE key words. Use ellipses for pauses.",
  "tts_content": "Speaker 1: Clean narration without section headers or formatting.",
  "music_prompt": "Suno-compatible dark/tense instrumental, genre-appropriate instruments, tempo, mood. No vocals.",
  "video_prompt": "Higgsfield: Genre-appropriate scene, vertical 9:16, atmospheric, slow camera movement. No text/logos/faces.",
  "visual_prompts": ["Scene 1 claymation image prompt", "Scene 2 claymation image prompt", "Scene 3 claymation image prompt", "Scene 4 claymation image prompt"],
  "sound_effects": ["Ambient horror drone", "Door creaking", "Footsteps on concrete", "Sudden silence"],
  "tags": ["genre", "series_tag", "mood_tag"],
  "word_count": 155,
  "estimated_duration_secs": 60
}]

RULES:
- Each episode is exactly 60 seconds / 150-160 words
- Episodes 1-4 MUST end with cliffhangers
- Episode 5 resolves but can hint at more
- TENSION structure: Tease(5s) → Establish(10s) → Navigate(25s) → Shift(10s) → Impact(5s) → Open(5s)
- Claymation visual aesthetic for all image prompts
- Vary cliffhanger types: revelation, danger, betrayal, mystery, countdown
- Each episode must advance the story significantly
- Use present tense narration, survivor/witness voice`;

const SERIES_PLANS = [
  // Zombie - 3 series
  { genre: 'zombie', name: 'The Last Broadcast', premise: 'A radio DJ is the last voice on the airwaves during a zombie outbreak, guiding survivors while trapped in the station' },
  { genre: 'zombie', name: 'Patient Zero\'s Diary', premise: 'Found footage style - reading the journal entries of the first infected person who slowly realizes what is happening to them' },
  { genre: 'zombie', name: 'The School Bus', premise: 'A school bus driver must protect a bus full of children across a zombie-infested city to reach the evacuation point' },
  // Alien - 2 series
  { genre: 'alien', name: 'The Signal', premise: 'An amateur radio operator receives a transmission from space that starts changing everyone who hears it' },
  { genre: 'alien', name: 'Terraform', premise: 'Earth\'s atmosphere begins changing overnight. Plants grow wrong. The aliens aren\'t invading — they\'re renovating' },
  // Heist - 2 series
  { genre: 'heist', name: 'The Vault Below', premise: 'A team discovers a vault beneath their city that predates civilization. What\'s inside is worth more than money' },
  { genre: 'heist', name: 'Double Blind', premise: 'Two rival crews unknowingly plan to rob the same target on the same night' },
  // Supernatural - 3 series
  { genre: 'supernatural', name: 'The Mirror Man', premise: 'A woman\'s reflection starts moving independently, and it knows things she doesn\'t' },
  { genre: 'supernatural', name: 'Floor Thirteen', premise: 'A hotel has a 13th floor that appears only at 3 AM. Guests who enter come back... different' },
  { genre: 'supernatural', name: 'The Collector', premise: 'An antique dealer realizes the items in his shop contain trapped souls that are starting to communicate' },
  // Mystery - 2 series
  { genre: 'mystery', name: 'The Missing Hour', premise: 'Every resident of a small town lost the same hour of memory. One by one, they start remembering' },
  { genre: 'mystery', name: 'Unsigned', premise: 'A detective receives anonymous letters predicting crimes before they happen — in his own handwriting' },
  // Survival - 2 series
  { genre: 'survival', name: 'Below Deck', premise: 'A cruise ship capsizes in the middle of the ocean. Survivors trapped inside must navigate upside-down corridors as water rises' },
  { genre: 'survival', name: 'The Last Elevator', premise: 'An earthquake traps eight strangers in a skyscraper elevator. The building is still collapsing' },
  // Psychological - 2 series
  { genre: 'psychological', name: 'The Other Tenant', premise: 'A man discovers someone has been living in his apartment walls, watching him for months' },
  { genre: 'psychological', name: 'Deja Vu', premise: 'A woman keeps reliving the same Tuesday, but each loop something is slightly more wrong' },
];

// ─── Claymation Variety Show ───
const CLAYMATION_SYSTEM = `You are a comedy writer for a Robot Chicken-style claymation variety show.
Generate a COMPLETE production-ready skit. Return ONLY valid JSON:
{
  "title": "Skit Title",
  "category": "skit_type (parody/original/mashup/commercial_spoof/musical_number)",
  "series_name": "Claymation Chaos",
  "episode_number": null,
  "script_content": "Full skit script with [COLD_OPEN], [SETUP], [ESCALATION], [PUNCHLINE], [TAG] section headers. 30-45 seconds. Visual comedy descriptions in brackets. Dialogue in quotes.",
  "tts_content": "Speaker 1: Narrator lines\\nSpeaker 2: Character lines\\n(describe visual gags in parentheses)",
  "music_prompt": "Suno-compatible: Fun/quirky instrumental appropriate for the skit mood. Short, punchy.",
  "video_prompt": "Higgsfield: Claymation style scene, colorful, exaggerated proportions, vertical 9:16. Describe set and characters.",
  "visual_prompts": ["Scene 1 claymation prompt", "Scene 2 claymation prompt", "Scene 3 claymation prompt"],
  "sound_effects": ["Cartoon boing", "Splat", "Comedy horn"],
  "tags": ["comedy", "claymation", "specific_tags"],
  "word_count": 80,
  "estimated_duration_secs": 40
}

RULES:
- Visual comedy first, dialogue second
- Absurdist humor, unexpected punchlines
- Claymation aesthetic in all descriptions (wobbly, fingerprint textures, googly eyes)
- Keep it snappy — no setup longer than 15 seconds
- Tag/stinger should subvert expectations`;

const CLAYMATION_TOPICS = {
  parody: [
    'Gordon Ramsay cooking show but he is a clay potato',
    'The Avengers assemble but they are all office supplies',
    'Star Wars but every character is a different food item',
    'Breaking Bad but Walter White makes clay instead of meth',
    'The Bachelor but all contestants are different shaped pasta',
    'Game of Thrones throne is actually a toilet',
    'The Matrix but Neo takes both pills and gets sick',
    'Jurassic Park but the dinosaurs are tiny and adorable',
    'Titanic but the ship is a rubber duck in a bathtub',
    'Harry Potter sorting hat has an existential crisis',
    'The Office but Michael Scott is a literal paper clip',
    'Fast and Furious but they drive shopping carts',
    'Jaws but the shark is terrified of the ocean',
    'Lord of the Rings but the ring is a mood ring',
    'The Godfather but he is an actual grandfather offering candy',
    'Stranger Things but the upside down is just Australia',
    'Mission Impossible but every mission is very possible',
    'The Walking Dead but zombies just want to be friends',
    'Batman but his superpower is extreme tax optimization',
    'The Lion King but Simba is a house cat',
    'Ghostbusters but the ghosts haunt a gym (ghost busters)',
    'Indiana Jones but the artifact is always a TV remote',
    'The Hunger Games but its an actual cooking competition',
    'Frozen but Elsa can only make room temperature things',
    'John Wick but he is a cat protecting his favorite toy',
  ],
  original: [
    'A clay sculpture comes alive and judges its creator',
    'Two clay figures discover they are in a stop-motion animation',
    'A vending machine that dispenses life advice instead of snacks',
    'Furniture in a house having a meeting about the humans',
    'A GPS that gives existential directions',
    'Socks in a dryer planning their great escape',
    'A cloud that is afraid of heights',
    'An alarm clock that oversleeps',
    'A traffic light having a midlife crisis',
    'Vegetables holding a trial for the chef',
    'A phone battery living its best one percent life',
    'Elevator music band performing their sold-out concert',
    'A parking meter that falls in love with a fire hydrant',
    'A spell check AI taking over a novel',
    'Two snowmen arguing about climate change',
    'A GPS and a compass on a road trip together',
    'A fortune cookie factory where fortunes come true literally',
    'Office printer that only prints passive aggressive notes',
    'A graveyard where tombstones gossip about the living',
    'Clay aliens visiting Earth for the first time at a Walmart',
    'A motivational poster that is deeply unmotivated',
    'Dust bunnies forming a civilization under the couch',
    'A thesaurus and a dictionary on a date',
    'Leftovers in the fridge forming a support group',
    'The last tree on earth becomes an influencer',
  ],
  mashup: [
    'Mario Kart meets rush hour traffic',
    'Cooking Mama meets Gordon Ramsay',
    'Pokemon but they are all emotional support animals',
    'Minecraft Steve at an architecture firm',
    'Pac-Man at an all-you-can-eat buffet',
    'Tetris blocks in couples therapy',
    'Angry Birds meets home renovation',
    'Sonic the Hedgehog at the DMV',
    'The Sims but they realize a player controls them',
    'Animal Crossing meets real estate market crash',
    'Candy Crush meets a dentist appointment',
    'Among Us meets a corporate team building event',
    'Flappy Bird in air traffic control',
    'Subway Surfers but its actual subway commuters',
    'Temple Run meets Amazon warehouse worker',
  ],
  commercial_spoof: [
    'A medication commercial where the side effects are actually better than the cure',
    'A car commercial for a car that only goes in reverse',
    'A perfume ad for a scent called "Monday Morning"',
    'An infomercial for a product that does absolutely nothing',
    'A fast food commercial where the food is brutally honest about itself',
    'A tech company launching a phone with no screen',
    'A fitness tracker that judges your life choices',
    'A mattress commercial where the mattress files for divorce',
    'A cleaning product that makes everything dirtier',
    'A dating app commercial for introverts that matches you with nobody',
    'A luxury watch ad but the watch is always wrong',
    'An energy drink that gives you the energy of a sloth',
    'A home security system that is more scared than you',
    'A toothpaste commercial where teeth have opinions',
    'A streaming service that only has one movie',
    'A travel agency for places that dont exist',
    'Insurance commercial for insuring your other insurance',
    'A food delivery app where the food delivers itself and is annoyed',
    'A shampoo commercial for bald people',
    'A sneaker ad where the shoes refuse to run',
  ],
  musical_number: [
    'A ballad sung by a lonely sock searching for its match',
    'A rap battle between breakfast cereals',
    'An opera performed by clay cats in an alley',
    'A broadway number by office supplies during after hours',
    'A country song by a city pigeon who dreams of the farm',
    'A heavy metal concert by tiny clay ants',
    'A jazz number by a broken umbrella in the rain',
    'A disco dance party in a refrigerator when the door closes',
    'A lullaby sung by a night light to scared monsters under the bed',
    'A sea shanty by clay pirates who are actually rubber ducks',
    'A boy band of five identical clay figures who cant agree on choreography',
    'A musical about a pen and pencil forbidden love story',
    'A blues song by a WiFi router that nobody appreciates',
    'K-pop performed by clay vegetables (the produce aisle idols)',
    'A folk song by a rocking chair about the good old days',
  ],
};

// ─── Hunni Bunni Kitchen ───
const HUNNIBUNNI_SYSTEM = `You are a kid-friendly cooking show script writer for "Hunni Bunni Kitchen" — a 3D animated show hosted by an adorable bunny character named Hunni Bunni in a cozy pastel kitchen.
Generate a COMPLETE production-ready recipe script. Return ONLY valid JSON:
{
  "title": "Recipe Name - Hunni Bunni Kitchen",
  "category": "meal_type (breakfast/lunch/dinner/desserts/snacks/drinks)",
  "series_name": "Hunni Bunni Kitchen",
  "episode_number": null,
  "script_content": "Full script with [GREETING], [INGREDIENTS], [COOKING_STEPS], [PRESENTATION], [SIGN_OFF] section headers. Kid-friendly language. Include bunny puns. Safety reminders. Fun food facts.",
  "tts_content": "Speaker 1: Hunni Bunni's narration in clean format. Cheerful, encouraging tone.",
  "music_prompt": "Suno-compatible: Cheerful, bouncy, cute instrumental. Ukulele, xylophone, light percussion. Happy kitchen vibes. No vocals.",
  "video_prompt": "Higgsfield: Cute 3D animated bunny character in pastel kitchen, cooking scene, warm lighting, vertical 9:16. Kawaii aesthetic.",
  "visual_prompts": ["Kitchen scene prompt", "Ingredient display prompt", "Cooking action prompt", "Final dish prompt"],
  "sound_effects": ["Cheerful kitchen timer ding", "Sizzling pan", "Cute bunny hop sound", "Magical sparkle"],
  "tags": ["cooking", "kids", "recipe_tags"],
  "word_count": 180,
  "estimated_duration_secs": 75
}

RULES:
- Kid-friendly vocabulary (ages 6-12)
- Simple recipes achievable by beginners
- Safety reminders near hot/sharp items ("Ask a grown-up bunny for help!")
- Fun food facts in each recipe
- Bunny puns and cute exclamations ("Hop-tastic!", "Bun-believable!")
- Ingredient measurements in simple terms
- Encouraging tone throughout`;

const HUNNIBUNNI_TOPICS = {
  breakfast: [
    'fluffy cloud pancakes with rainbow berries', 'bunny-shaped French toast',
    'overnight oats with honey and bananas', 'scrambled egg sunshine cups',
    'granola parfait towers', 'peanut butter banana smoothie bowl',
    'cinnamon roll bites', 'avocado toast with a smiley face',
    'berry blast breakfast muffins', 'yogurt bark with sprinkles',
    'apple pie oatmeal', 'egg in a bunny-shaped hole toast',
    'chocolate chip waffles', 'fruit rainbow skewers',
    'maple pecan cereal clusters', 'strawberry cream cheese bagel bites',
    'breakfast quesadilla triangles', 'blueberry lemon scones',
    'tropical sunrise smoothie', 'mini breakfast pizzas',
  ],
  lunch: [
    'rainbow veggie wraps', 'tomato soup with star-shaped crackers',
    'mini pizza bagels with happy faces', 'chicken nugget garden bowls',
    'mac and cheese muffin cups', 'cucumber sushi rolls for beginners',
    'grilled cheese dippers with tomato soup', 'turkey pinwheel sandwiches',
    'pasta salad rainbow jars', 'hummus and veggie bento box',
    'taco cups in tortilla bowls', 'chicken quesadilla triangles',
    'pita pocket stuffed animals shapes', 'fried rice with hidden veggies',
    'caprese skewers', 'coconut chicken strips',
    'broccoli cheddar soup in bread bowls', 'BLT pinwheels',
    'sweet potato fries with dipping sauces', 'teriyaki chicken rice bowls',
  ],
  dinner: [
    'spaghetti and meatball mountains', 'build your own taco night',
    'baked chicken drumstick lollipops', 'veggie stir fry rainbow',
    'homemade pepperoni pizza', 'creamy chicken alfredo nests',
    'beef and broccoli bowls', 'fish stick tacos', 'butter chicken with naan dippers',
    'stuffed bell pepper boats', 'chicken pot pie cups',
    'teriyaki salmon with rice', 'lasagna roll-ups',
    'honey garlic shrimp bowls', 'cheeseburger sliders',
    'chicken parmesan bites', 'shepherd pie cups',
    'sweet and sour chicken', 'black bean enchiladas',
    'lemon herb baked cod', 'pulled BBQ chicken sandwiches',
    'mushroom risotto bites', 'pesto pasta with cherry tomatoes',
    'meatloaf muffins', 'coconut curry noodle bowls',
    'Hawaiian pizza quesadillas', 'garlic butter shrimp pasta',
    'stuffed zucchini boats', 'crispy baked tofu bowls',
    'Swedish meatballs with egg noodles',
  ],
  desserts: [
    'chocolate lava mug cake', 'strawberry shortcake cups',
    'no-bake cheesecake bites', 'cookie dough truffles',
    'banana ice cream sundaes', 'brownie batter hummus',
    'fruit tart cups', 'rice krispie treat pops',
    'peanut butter cup smoothie', 'apple crumble cups',
    'mochi ice cream balls', 'churro bites with chocolate sauce',
    'layered pudding parfaits', 'frozen yogurt bark',
    'mini carrot cake cupcakes', 's\'mores dip',
    'cinnamon sugar donut holes', 'matcha white chocolate cookies',
    'raspberry lemon bars', 'unicorn cake pops',
  ],
  snacks: [
    'ants on a log (celery peanut butter raisins)', 'trail mix bunny mix',
    'cheese and crackers with shapes', 'apple nachos with toppings',
    'popcorn seasoning bar', 'frozen banana pops',
    'veggie cups with ranch', 'energy ball bites',
    'pretzel bites with cheese dip', 'fruit leather rolls',
    'rice cake decorating station', 'yogurt covered blueberries',
    'edamame with sea salt', 'cucumber cream cheese rounds',
    'homemade fruit gummies',
  ],
  drinks: [
    'strawberry lemonade sparkler', 'hot chocolate with bunny marshmallows',
    'mango lassi smoothie', 'watermelon agua fresca',
    'lavender honey milk', 'tropical fruit punch',
    'iced vanilla matcha latte (kid version)', 'berry blast smoothie',
    'apple cider with cinnamon', 'cucumber mint cooler',
    'peach iced tea', 'chocolate banana shake',
    'orange creamsicle float', 'pineapple coconut cooler',
    'warm spiced apple juice',
  ],
};

// ─── Main Generation Loop ───
async function main() {
  console.log('🎬 Mass Script Generator Starting...');
  
  // Ensure Hunni Bunni framework exists
  const hbId = await ensureHunniBunniFramework();
  console.log('✅ Hunni Bunni framework:', hbId ? 'ready' : 'FAILED');
  
  const frameworks = await getFrameworks();
  console.log('📋 Frameworks:', JSON.stringify(frameworks));
  
  if (!frameworks.asmpro || !frameworks.tension || !frameworks.claymation) {
    console.error('Missing frameworks! Run setup first.');
    return;
  }
  
  // Re-fetch to get hunnibunni
  const allFrameworks = await getFrameworks();
  
  let totalGenerated = 0;
  const stats = { asmpro: 0, tension: 0, claymation: 0, hunnibunni: 0 };
  
  // Generate in parallel batches across all frameworks
  // Strategy: round-robin across frameworks, 1 at a time to avoid rate limits
  
  const generators = [
    ...buildASMProQueue(allFrameworks.asmpro),
    ...buildTensionQueue(allFrameworks.tension),
    ...buildClaymationQueue(allFrameworks.claymation),
    ...buildHunniBunniQueue(allFrameworks.hunnibunni),
  ];
  
  // Shuffle to distribute across frameworks
  shuffle(generators);
  
  console.log(`📊 Total generation tasks: ${generators.length}`);
  
  for (let i = 0; i < generators.length; i++) {
    const gen = generators[i];
    try {
      console.log(`\n[${i+1}/${generators.length}] Generating: ${gen.type} - ${gen.label}`);
      const result = await gen.fn();
      if (result) {
        stats[gen.type] += (Array.isArray(result) ? result.length : 1);
        totalGenerated += (Array.isArray(result) ? result.length : 1);
        console.log(`  ✅ Success! Total: ${totalGenerated}`);
      } else {
        console.log(`  ❌ Failed`);
      }
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`);
    }
    
    // Rate limit: wait between generations
    if (i < generators.length - 1) await sleep(2000);
    
    // Progress report every 10
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 Progress: ${totalGenerated} scripts generated`);
      console.log(`   ASMPro: ${stats.asmpro} | Clay Verse: ${stats.tension} | Claymation: ${stats.claymation} | Hunni Bunni: ${stats.hunnibunni}`);
    }
  }
  
  console.log('\n🎉 GENERATION COMPLETE');
  console.log(`Total: ${totalGenerated} scripts`);
  console.log(`ASMPro: ${stats.asmpro} | Clay Verse: ${stats.tension} | Claymation: ${stats.claymation} | Hunni Bunni: ${stats.hunnibunni}`);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildASMProQueue(frameworkId) {
  const queue = [];
  for (const [category, topics] of Object.entries(ASMPRO_TOPICS)) {
    for (const { topic, archetype } of topics) {
      queue.push({
        type: 'asmpro',
        label: `${category}/${topic}`,
        fn: async () => {
          const prompt = `Generate a ${category} script about "${topic}" using the ${archetype} archetype. Make it unique, powerful, and production-ready.`;
          const raw = await aiGenerate(ASMPRO_SYSTEM, prompt);
          if (!raw) return null;
          const parsed = parseJsonFromAI(raw);
          if (!parsed) { console.error('  Parse failed for ASMPro:', topic); return null; }
          parsed.framework_id = frameworkId;
          parsed.category = category;
          return await insertScript(parsed);
        },
      });
    }
  }
  return queue;
}

function buildTensionQueue(frameworkId) {
  const queue = [];
  for (const series of SERIES_PLANS) {
    queue.push({
      type: 'tension',
      label: `${series.genre}/${series.name}`,
      fn: async () => {
        const prompt = `Generate a complete 5-part ${series.genre} series called "${series.name}".
Premise: ${series.premise}
Return an array of 5 episode objects. Each episode 150-160 words. Episodes 1-4 end with cliffhangers. Episode 5 resolves the story.
Use varied cliffhanger types. Make each episode advance the story significantly. Claymation visual aesthetic.`;
        const raw = await aiGenerate(TENSION_SYSTEM, prompt);
        if (!raw) return null;
        const parsed = parseJsonFromAI(raw);
        if (!parsed || !Array.isArray(parsed)) { console.error('  Parse failed for series:', series.name); return null; }
        const results = [];
        for (const ep of parsed) {
          ep.framework_id = frameworkId;
          ep.category = series.genre;
          const r = await insertScript(ep);
          if (r) results.push(r);
        }
        return results;
      },
    });
  }
  return queue;
}

function buildClaymationQueue(frameworkId) {
  const queue = [];
  for (const [skitType, topics] of Object.entries(CLAYMATION_TOPICS)) {
    for (const topic of topics) {
      queue.push({
        type: 'claymation',
        label: `${skitType}/${topic.substring(0, 40)}`,
        fn: async () => {
          const prompt = `Generate a ${skitType} skit: "${topic}". Make it hilarious, visual, and punchy. Claymation style.`;
          const raw = await aiGenerate(CLAYMATION_SYSTEM, prompt);
          if (!raw) return null;
          const parsed = parseJsonFromAI(raw);
          if (!parsed) { console.error('  Parse failed for claymation:', topic); return null; }
          parsed.framework_id = frameworkId;
          parsed.category = skitType;
          return await insertScript(parsed);
        },
      });
    }
  }
  return queue;
}

function buildHunniBunniQueue(frameworkId) {
  if (!frameworkId) return [];
  const queue = [];
  for (const [category, recipes] of Object.entries(HUNNIBUNNI_TOPICS)) {
    for (const recipe of recipes) {
      queue.push({
        type: 'hunnibunni',
        label: `${category}/${recipe.substring(0, 40)}`,
        fn: async () => {
          const prompt = `Generate a ${category} recipe script for "${recipe}". Make it fun, educational, and kid-friendly. Include real cooking steps and a fun food fact.`;
          const raw = await aiGenerate(HUNNIBUNNI_SYSTEM, prompt);
          if (!raw) return null;
          const parsed = parseJsonFromAI(raw);
          if (!parsed) { console.error('  Parse failed for hunni bunni:', recipe); return null; }
          parsed.framework_id = frameworkId;
          parsed.category = category;
          return await insertScript(parsed);
        },
      });
    }
  }
  return queue;
}

main().catch(console.error);
