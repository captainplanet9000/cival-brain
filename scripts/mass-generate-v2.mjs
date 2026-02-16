// Mass Script Generator v2 - Parallel generation with individual episode requests
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vusjcfushwxwksfuszjv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ';
const GATEWAY_URL = 'https://desktop-2948l01.taile3b948.ts.net';
const GATEWAY_TOKEN = '6cd281e2cc11b39fecb53a2205fe94d8f2dc04fc2900c5f1';
const CONCURRENCY = 3; // parallel AI calls

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const stats = { asmpro: 0, tension: 0, claymation: 0, hunnibunni: 0, errors: 0 };
let totalDone = 0;

async function aiGenerate(systemPrompt, userPrompt) {
  for (let i = 0; i < 2; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout
      const res = await fetch(GATEWAY_URL + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4-20250514',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 3000,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) { console.error(`  API ${res.status}`); await sleep(3000); continue; }
      const j = await res.json();
      return j.choices?.[0]?.message?.content || '';
    } catch (e) {
      console.error(`  Attempt ${i+1}: ${e.message}`);
      await sleep(3000);
    }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseJson(text) {
  if (!text) return null;
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = m ? m[1].trim() : text.trim();
  try { return JSON.parse(raw); } catch {
    // Try to find JSON object
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) try { return JSON.parse(objMatch[0]); } catch {}
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) try { return JSON.parse(arrMatch[0]); } catch {}
    return null;
  }
}

async function insertScript(script) {
  const wc = (script.script_content || '').split(/\s+/).filter(Boolean).length;
  // Move sound_effects to metadata since column doesn't exist
  const { sound_effects, ...rest } = script;
  const metadata = { ...(rest.metadata || {}), sound_effects: sound_effects || [] };
  delete rest.metadata;
  const { data, error } = await sb.from('scripts').insert({
    ...rest,
    metadata,
    word_count: rest.word_count || wc,
    estimated_duration_secs: rest.estimated_duration_secs || Math.round(wc / 2.5),
    status: 'draft',
  }).select('id, title').single();
  if (error) { console.error('  DB:', error.message); return null; }
  return data;
}

async function getFrameworks() {
  const { data } = await sb.from('script_frameworks').select('id, slug');
  const map = {};
  for (const f of data || []) map[f.slug] = f.id;
  return map;
}

// Run tasks with concurrency limit
async function runParallel(tasks, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      const task = tasks[i];
      try {
        console.log(`[${i+1}/${tasks.length}] ${task.type}: ${task.label}`);
        const r = await task.fn();
        if (r) {
          const count = Array.isArray(r) ? r.length : 1;
          stats[task.type] += count;
          totalDone += count;
          console.log(`  ✅ +${count} (total: ${totalDone})`);
        } else {
          stats.errors++;
          console.log(`  ❌ failed`);
        }
        results.push(r);
      } catch (e) {
        stats.errors++;
        console.error(`  ❌ ${e.message}`);
      }
      await sleep(1000);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

// ─── SYSTEM PROMPTS ───
const ASMPRO_SYS = `You are an expert motivational script writer using Monroe's Motivated Sequence. Return ONLY valid JSON (no markdown, no code blocks):
{"title":"string","category":"string","series_name":"What I Need to Hear","episode_number":null,"script_content":"Full script with [ATTENTION],[NEED],[SATISFACTION],[VISUALIZATION],[ACTION] sections. 225-300 words. Present tense. Identity language.","tts_content":"Speaker 1: Clean narration without headers.","music_prompt":"Suno: Cinematic instrumental, 92 BPM, specific instruments, no vocals.","video_prompt":"Higgsfield: Scene description, 9:16, slow camera, no text/faces.","visual_prompts":["prompt1","prompt2","prompt3"],"sound_effects":["sfx1","sfx2","sfx3"],"tags":["t1","t2"],"word_count":250,"estimated_duration_secs":100}
Rules: Present tense only. "I am" not "I will be". 7-14 words/line. 3-step plan in SATISFACTION. If-Then protocols. Sensory VISUALIZATION. No clichés.`;

const TENSION_SYS = `You are a fiction writer for TikTok. Return ONLY valid JSON (no markdown):
{"title":"string","category":"genre","series_name":"string","episode_number":N,"script_content":"Script with [TEASE],[ESTABLISH],[NAVIGATE],[SHIFT],[IMPACT],[OPEN] sections. 150-160 words.","tts_content":"Speaker 1: Clean narration.","music_prompt":"Suno: Dark/tense instrumental, genre-appropriate.","video_prompt":"Higgsfield: Genre scene, 9:16, claymation style.","visual_prompts":["p1","p2","p3","p4"],"sound_effects":["s1","s2","s3"],"tags":["t1","t2"],"word_count":155,"estimated_duration_secs":60}
Rules: 150-160 words. CAPITALIZE key words. Ellipses for pauses. Cliffhanger ending (except ep 5). TENSION structure. Claymation visual aesthetic.`;

const CLAY_SYS = `You are a comedy writer for a claymation variety show (Robot Chicken style). Return ONLY valid JSON (no markdown):
{"title":"string","category":"skit_type","series_name":"Claymation Chaos","episode_number":null,"script_content":"Script with [COLD_OPEN],[SETUP],[ESCALATION],[PUNCHLINE],[TAG] sections. 30-45 seconds.","tts_content":"Speaker 1: Narrator\\nSpeaker 2: Character dialogue","music_prompt":"Suno: Fun quirky instrumental.","video_prompt":"Higgsfield: Claymation scene, colorful, 9:16.","visual_prompts":["p1","p2","p3"],"sound_effects":["s1","s2","s3"],"tags":["comedy","claymation","t3"],"word_count":80,"estimated_duration_secs":40}
Rules: Visual comedy first. Absurdist humor. Claymation aesthetic (wobbly, fingerprints, googly eyes). Snappy pacing. Unexpected punchline.`;

const HB_SYS = `You are a kid-friendly cooking show writer for "Hunni Bunni Kitchen" with an adorable bunny host. Return ONLY valid JSON (no markdown):
{"title":"string","category":"meal_type","series_name":"Hunni Bunni Kitchen","episode_number":null,"script_content":"Script with [GREETING],[INGREDIENTS],[COOKING_STEPS],[PRESENTATION],[SIGN_OFF] sections.","tts_content":"Speaker 1: Hunni Bunni's cheerful narration.","music_prompt":"Suno: Cheerful bouncy ukulele xylophone instrumental.","video_prompt":"Higgsfield: Cute 3D bunny in pastel kitchen, 9:16, kawaii.","visual_prompts":["p1","p2","p3","p4"],"sound_effects":["s1","s2","s3"],"tags":["cooking","kids","t3"],"word_count":180,"estimated_duration_secs":75}
Rules: Kid-friendly (ages 6-12). Simple vocabulary. Safety reminders. Bunny puns. Real cooking steps. Fun food fact.`;

// ─── TOPIC DATA ───
const ASMPRO_TOPICS = [
  // pre_interview (30)
  ...['salary negotiation','panel interview composure','technical interview clarity','first impression mastery','career pivot interview','executive leadership interview','remote video interview','behavioral questions','startup culture fit','second round callback','interview anxiety','group interview','internal promotion','creative portfolio','tough questions','post-rejection comeback','case study interview','cross-cultural interview','final round closing','phone screen','leadership experience','weakness questions','benefits negotiation','medical school interview','law firm interview','handling silence','assessment center','consulting case','teaching demo','military to civilian'].map(t => ({ cat: 'pre_interview', topic: t, arch: ['calm_mentor','executive_gravitas','focus_scientist','high_performance','gentle_compassion','urgency_coach'][Math.floor(Math.random()*6)] })),
  // pre_test (25)
  ...['final exam focus','standardized test calm','certification readiness','board exam confidence','driving test composure','licensing exam mastery','GRE preparation','bar exam strength','medical boards','math test anxiety','oral examination','midterm sprint','language proficiency','fitness test','thesis defense','AP exam focus','MCAT endurance','CPA persistence','pilot certification','nursing boards','real estate exam','LSAT thinking','music performance exam','coding assessment','SAT preparation'].map(t => ({ cat: 'pre_test', topic: t, arch: ['calm_mentor','executive_gravitas','focus_scientist','high_performance','gentle_compassion','urgency_coach'][Math.floor(Math.random()*6)] })),
  // performance (30)
  ...['public speaking','athletic competition','musical performance','sales presentation','creative performance','keynote delivery','marathon mindset','comedy debut','courtroom presence','dance recital','investor pitch','surgical focus','first day teaching','debate tournament','powerlifting competition','wedding toast','board review','live streaming','martial arts','conference presentation','training demo','theater audition','podcast flow','Olympic qualifying','TED talk','chess tournament','cooking competition','exhibition opening','sprint race','client presentation'].map(t => ({ cat: 'performance', topic: t, arch: ['calm_mentor','executive_gravitas','focus_scientist','high_performance','gentle_compassion','urgency_coach'][Math.floor(Math.random()*6)] })),
  // mental_clarity (30)
  ...['morning reset','decision fatigue','information overload','creative block','post-conflict reset','focus after distraction','overwhelm to clarity','late night focus','anxiety to action','grief processing','post-breakup reset','financial stress','burnout recovery','Monday activation','afternoon reset','social media detox','parent multitask','post-travel recovery','deadline pressure','rumination breaking','seasonal depression','career crossroads','comparison trap','perfectionism release','post-argument composure','analysis paralysis','chronic pain focus','new city adjustment','imposter syndrome','Sunday anxiety'].map(t => ({ cat: 'mental_clarity', topic: t, arch: ['calm_mentor','executive_gravitas','focus_scientist','high_performance','gentle_compassion','urgency_coach'][Math.floor(Math.random()*6)] })),
  // self_belief (35)
  ...['starting a business','returning to education','overcoming childhood criticism','first gen college','rebuilding after failure','artistic identity','leadership activation','body confidence','setting boundaries','speaking up in meetings','deserving success','aging with power','solo travel courage','leaving toxic relationship','immigrant success','creative career','disability resilience','single parent strength','recovery new identity','career change at forty','introvert leadership','first homebuyer','asking for raise','publishing first book','running for office','standing in truth','second chance','trusting after betrayal','athlete comeback','quiet confidence','choosing yourself','embracing unique voice','walking from safe career','loving your reflection','becoming parent you needed'].map(t => ({ cat: 'self_belief', topic: t, arch: ['calm_mentor','executive_gravitas','focus_scientist','high_performance','gentle_compassion','urgency_coach'][Math.floor(Math.random()*6)] })),
];

const SERIES_PLANS = [
  { genre:'zombie', name:'The Last Broadcast', premise:'Radio DJ is last voice on air during outbreak, guiding survivors while trapped' },
  { genre:'zombie', name:'Patient Zero Diary', premise:'Journal entries of first infected person slowly realizing what is happening' },
  { genre:'zombie', name:'The School Bus', premise:'Bus driver protecting children across zombie city to evacuation point' },
  { genre:'alien', name:'The Signal', premise:'Amateur radio operator receives space transmission that changes everyone who hears it' },
  { genre:'alien', name:'Terraform', premise:'Earth atmosphere changing overnight, plants growing wrong - aliens renovating not invading' },
  { genre:'heist', name:'The Vault Below', premise:'Team discovers vault beneath city predating civilization, contents worth more than money' },
  { genre:'heist', name:'Double Blind', premise:'Two rival crews unknowingly plan to rob same target same night' },
  { genre:'supernatural', name:'The Mirror Man', premise:'Woman reflection moves independently and knows things she does not' },
  { genre:'supernatural', name:'Floor Thirteen', premise:'Hotel 13th floor appears only at 3 AM, guests return different' },
  { genre:'supernatural', name:'The Collector', premise:'Antique dealer items contain trapped souls starting to communicate' },
  { genre:'mystery', name:'The Missing Hour', premise:'Every town resident lost same hour of memory, one by one remembering' },
  { genre:'mystery', name:'Unsigned', premise:'Detective receives anonymous letters predicting crimes in his own handwriting' },
  { genre:'survival', name:'Below Deck', premise:'Capsized cruise ship, survivors navigate upside-down corridors as water rises' },
  { genre:'survival', name:'The Last Elevator', premise:'Earthquake traps eight strangers in skyscraper elevator, building still collapsing' },
  { genre:'psychological', name:'The Other Tenant', premise:'Man discovers someone living in his apartment walls watching him for months' },
  { genre:'psychological', name:'Deja Vu', premise:'Woman reliving same Tuesday but each loop something slightly more wrong' },
];

const CLAY_TOPICS = [
  // parody (25)
  ...['Gordon Ramsay as clay potato','Avengers are office supplies','Star Wars characters are food','Breaking Bad makes clay not meth','Bachelor contestants are pasta shapes','Game of Thrones throne is toilet','Matrix Neo takes both pills','Jurassic Park tiny adorable dinos','Titanic rubber duck in bathtub','Harry Potter sorting hat crisis','The Office Michael is paper clip','Fast Furious shopping carts','Jaws shark afraid of ocean','Lord of Rings mood ring','Godfather actual grandfather candy','Stranger Things upside down is Australia','Mission Impossible very possible','Walking Dead friendly zombies','Batman tax optimization power','Lion King house cat Simba','Ghostbusters gym ghosts','Indiana Jones finds TV remote','Hunger Games cooking competition','Frozen room temperature powers','John Wick cat protecting toy'].map(t => ({ type: 'parody', topic: t })),
  // original (25)
  ...['Clay sculpture judges creator','Clay figures discover stop-motion','Vending machine gives life advice','Furniture meeting about humans','GPS existential directions','Socks dryer escape plan','Cloud afraid of heights','Alarm clock oversleeps','Traffic light midlife crisis','Vegetables trial for chef','Phone battery one percent life','Elevator music band concert','Parking meter loves fire hydrant','Spell check takes over novel','Snowmen argue climate change','GPS compass road trip','Fortune cookie fortunes literal','Printer passive aggressive notes','Tombstones gossip about living','Aliens visit Walmart','Unmotivated motivational poster','Dust bunny civilization','Thesaurus dictionary date','Leftovers support group','Last tree becomes influencer'].map(t => ({ type: 'original', topic: t })),
  // mashup (15)
  ...['Mario Kart rush hour','Cooking Mama meets Ramsay','Pokemon emotional support animals','Minecraft architect firm','Pac-Man buffet','Tetris couples therapy','Angry Birds renovation','Sonic at DMV','Sims realize player controls','Animal Crossing market crash','Candy Crush dentist','Among Us team building','Flappy Bird air traffic','Subway Surfers actual commuters','Temple Run warehouse worker'].map(t => ({ type: 'mashup', topic: t })),
  // commercial_spoof (20)
  ...['Side effects better than cure','Car only goes reverse','Perfume Monday Morning','Product does nothing','Fast food brutally honest','Phone with no screen','Fitness tracker judges you','Mattress files divorce','Cleaner makes dirtier','Dating app matches nobody','Watch always wrong','Sloth energy drink','Security system scared','Teeth have opinions toothpaste','One movie streaming service','Travel agency fake places','Insurance for insurance','Food delivery annoyed food','Shampoo for bald','Shoes refuse to run'].map(t => ({ type: 'commercial_spoof', topic: t })),
  // musical_number (15)
  ...['Lonely sock ballad','Cereal rap battle','Cat alley opera','Office supplies broadway','City pigeon country song','Ant heavy metal','Broken umbrella jazz','Fridge disco party','Night light lullaby to monsters','Rubber duck sea shanty','Boy band clay choreography','Pen pencil love musical','WiFi router blues','Vegetable K-pop','Rocking chair folk song'].map(t => ({ type: 'musical_number', topic: t })),
];

const HB_TOPICS = [
  // breakfast (20)
  ...['fluffy cloud pancakes','bunny French toast','overnight oats honey banana','scrambled egg cups','granola parfait towers','PB banana smoothie bowl','cinnamon roll bites','avocado smiley toast','berry breakfast muffins','yogurt bark sprinkles','apple pie oatmeal','bunny hole toast','chocolate chip waffles','fruit rainbow skewers','maple pecan clusters','strawberry cream bagels','breakfast quesadillas','blueberry lemon scones','tropical sunrise smoothie','mini breakfast pizzas'].map(t => ({ cat: 'breakfast', recipe: t })),
  // lunch (20)
  ...['rainbow veggie wraps','star cracker tomato soup','mini pizza bagels','chicken nugget garden','mac cheese muffin cups','beginner sushi rolls','grilled cheese dippers','turkey pinwheels','pasta salad jars','hummus veggie bento','taco cups','chicken quesadillas','pita pocket stuffed','hidden veggie fried rice','caprese skewers','coconut chicken strips','broccoli cheddar soup','BLT pinwheels','sweet potato fries','teriyaki rice bowls'].map(t => ({ cat: 'lunch', recipe: t })),
  // dinner (30)
  ...['spaghetti meatball mountains','build your own tacos','chicken drumstick lollipops','veggie stir fry rainbow','homemade pizza','chicken alfredo nests','beef broccoli bowls','fish stick tacos','butter chicken naan','stuffed pepper boats','chicken pot pie cups','teriyaki salmon rice','lasagna roll-ups','honey garlic shrimp','cheeseburger sliders','chicken parm bites','shepherd pie cups','sweet sour chicken','black bean enchiladas','lemon herb cod','BBQ chicken sandwiches','mushroom risotto bites','pesto cherry tomato pasta','meatloaf muffins','coconut curry noodles','Hawaiian pizza quesadillas','garlic butter shrimp pasta','stuffed zucchini boats','crispy tofu bowls','Swedish meatball noodles'].map(t => ({ cat: 'dinner', recipe: t })),
  // desserts (20)
  ...['chocolate lava mug cake','strawberry shortcake cups','no-bake cheesecake bites','cookie dough truffles','banana ice cream sundae','brownie batter hummus','fruit tart cups','rice krispie pops','PB cup smoothie','apple crumble cups','mochi ice cream','churro bites chocolate','layered pudding parfaits','frozen yogurt bark','mini carrot cupcakes','smores dip','cinnamon donut holes','matcha white choc cookies','raspberry lemon bars','unicorn cake pops'].map(t => ({ cat: 'desserts', recipe: t })),
  // snacks (15)
  ...['ants on a log','trail mix bunny mix','cheese cracker shapes','apple nachos','popcorn seasoning bar','frozen banana pops','veggie ranch cups','energy ball bites','pretzel cheese dip','fruit leather rolls','rice cake decorating','yogurt blueberries','edamame sea salt','cucumber cream rounds','homemade fruit gummies'].map(t => ({ cat: 'snacks', recipe: t })),
  // drinks (15)
  ...['strawberry lemonade sparkler','hot chocolate bunny marshmallows','mango lassi smoothie','watermelon agua fresca','lavender honey milk','tropical fruit punch','kid vanilla matcha','berry blast smoothie','apple cider cinnamon','cucumber mint cooler','peach iced tea','chocolate banana shake','orange creamsicle float','pineapple coconut cooler','warm spiced apple juice'].map(t => ({ cat: 'drinks', recipe: t })),
];

// ─── Build task queue ───
function buildTasks(frameworks) {
  const tasks = [];
  
  // ASMPro tasks
  for (const { cat, topic, arch } of ASMPRO_TOPICS) {
    tasks.push({
      type: 'asmpro', label: `${cat}/${topic}`,
      fn: async () => {
        const raw = await aiGenerate(ASMPRO_SYS, `Generate a ${cat} script about "${topic}" using ${arch} archetype. Unique and production-ready.`);
        const p = parseJson(raw);
        if (!p) return null;
        p.framework_id = frameworks.asmpro;
        p.category = cat;
        return insertScript(p);
      }
    });
  }
  
  // Tension/Clay Verse - individual episodes
  for (const s of SERIES_PLANS) {
    for (let ep = 1; ep <= 5; ep++) {
      tasks.push({
        type: 'tension', label: `${s.genre}/${s.name} E${ep}`,
        fn: async () => {
          const cliffNote = ep < 5 ? 'End with a CLIFFHANGER.' : 'Resolve the story but hint at more.';
          const epArc = ['Setup and first encounter','Escalation and complication','Major twist/crisis','Desperate push','Final resolution'][ep-1];
          const raw = await aiGenerate(TENSION_SYS, `Series: "${s.name}" (${s.genre}). Premise: ${s.premise}. 
Episode ${ep}/5: "${epArc}". ${cliffNote}
Make it 150-160 words, gripping, with claymation visuals.`);
          const p = parseJson(raw);
          if (!p) return null;
          p.framework_id = frameworks.tension;
          p.category = s.genre;
          p.series_name = s.name;
          p.episode_number = ep;
          return insertScript(p);
        }
      });
    }
  }
  
  // Claymation
  for (const { type, topic } of CLAY_TOPICS) {
    tasks.push({
      type: 'claymation', label: `${type}/${topic.substring(0,30)}`,
      fn: async () => {
        const raw = await aiGenerate(CLAY_SYS, `Generate a ${type} skit: "${topic}". Hilarious, visual, punchy.`);
        const p = parseJson(raw);
        if (!p) return null;
        p.framework_id = frameworks.claymation;
        p.category = type;
        return insertScript(p);
      }
    });
  }
  
  // Hunni Bunni
  for (const { cat, recipe } of HB_TOPICS) {
    tasks.push({
      type: 'hunnibunni', label: `${cat}/${recipe}`,
      fn: async () => {
        const raw = await aiGenerate(HB_SYS, `Generate a ${cat} recipe script for "${recipe}". Fun, educational, kid-friendly with real cooking steps.`);
        const p = parseJson(raw);
        if (!p) return null;
        p.framework_id = frameworks.hunnibunni;
        p.category = cat;
        return insertScript(p);
      }
    });
  }
  
  // Shuffle for variety
  for (let i = tasks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
  }
  
  return tasks;
}

async function main() {
  console.log('🎬 Mass Script Generator v2 Starting...');
  console.log(`⚡ Concurrency: ${CONCURRENCY}`);
  
  const frameworks = await getFrameworks();
  console.log('📋 Frameworks:', JSON.stringify(frameworks));
  
  if (!frameworks.asmpro || !frameworks.tension || !frameworks.claymation || !frameworks.hunnibunni) {
    console.error('❌ Missing frameworks!', frameworks);
    return;
  }
  
  const tasks = buildTasks(frameworks);
  console.log(`📊 Total tasks: ${tasks.length}`);
  console.log(`   ASMPro: ${ASMPRO_TOPICS.length} | Clay Verse: ${SERIES_PLANS.length * 5} | Claymation: ${CLAY_TOPICS.length} | Hunni Bunni: ${HB_TOPICS.length}`);
  
  const startTime = Date.now();
  await runParallel(tasks, CONCURRENCY);
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n🎉 GENERATION COMPLETE');
  console.log(`⏱ Elapsed: ${Math.floor(elapsed/60)}m ${elapsed%60}s`);
  console.log(`✅ Total: ${totalDone} scripts`);
  console.log(`   ASMPro: ${stats.asmpro} | Clay Verse: ${stats.tension} | Claymation: ${stats.claymation} | Hunni Bunni: ${stats.hunnibunni}`);
  console.log(`   Errors: ${stats.errors}`);
}

main().catch(console.error);
