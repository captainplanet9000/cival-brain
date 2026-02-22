import { NextRequest, NextResponse } from 'next/server';

const NATURE_ELEMENTS: Record<string, string[]> = {
  empowering: ['towering ancient redwood forest with golden light piercing through canopy', 'massive waterfall cascading into mist with rainbow fragments', 'eagle soaring above mountain peaks at golden hour'],
  reflective: ['still lake reflecting autumn trees in perfect symmetry', 'gentle river flowing through a misty valley at dawn', 'rain falling on a quiet pond creating expanding ripples'],
  calming: ['soft ocean waves rolling onto a sandy beach at sunset', 'meadow of wildflowers swaying in gentle breeze', 'snow falling silently on a peaceful pine forest'],
  intense: ['volcanic lightning during eruption against dark sky', 'massive ocean storm waves crashing against rocky cliffs', 'tornado forming on distant plains under dramatic sky'],
  hopeful: ['first light of sunrise breaking over misty mountains', 'rainbow forming after a storm over green landscape', 'spring flowers emerging through melting snow'],
  melancholic: ['lone tree on a hilltop in autumn fog', 'empty beach at twilight with grey clouds', 'bare winter branches against a pale overcast sky'],
  triumphant: ['sun breaking through dark storm clouds over mountain peak', 'eagle rising above thunderstorm into clear blue sky', 'massive ancient tree standing strong against powerful wind'],
  ethereal: ['northern aurora dancing across arctic sky over ice', 'bioluminescent waves on a dark beach under stars', 'fog rolling through an enchanted ancient forest at twilight'],
};

const ABSTRACT_ELEMENTS: Record<string, string[]> = {
  empowering: ['expanding golden geometric mandala radiating outward', 'molten metal particles rising and forming powerful shapes', 'explosive burst of light particles in gold and white'],
  reflective: ['slow morphing liquid mercury shapes reflecting light', 'ink drops blooming in clear water in slow motion', 'gentle sine wave visualizations in muted colors'],
  calming: ['soft gradient color waves flowing like silk', 'minimal floating orbs with gentle glow pulsing', 'smooth fluid dynamics in pastel colors'],
  intense: ['rapid geometric fractals expanding in electric colors', 'lightning-like energy patterns branching through dark space', 'aggressive angular shapes forming and shattering'],
  hopeful: ['seeds of light growing into branching tree patterns', 'warm color particles coalescing into upward spiral', 'broken pieces floating together and reforming with golden light'],
  melancholic: ['fading light particles slowly dissolving into darkness', 'blue watercolor bleeding and spreading on dark surface', 'thin threads of light stretching and breaking apart'],
  triumphant: ['phoenix-like form rising from scattered embers', 'diamond-shaped light burst with radiating power lines', 'golden ratio spiral expanding with increasing brilliance'],
  ethereal: ['sacred geometry slowly rotating with particle trails', 'holographic prismatic light refracting through invisible forms', 'quantum particle field shimmering between dimensions'],
};

const URBAN_ELEMENTS: Record<string, string[]> = {
  empowering: ['city skyline at dawn with first light on glass towers', 'aerial view of illuminated city grid at night', 'modern architecture rising into dramatic sky'],
  reflective: ['rain-soaked empty street reflecting neon lights', 'quiet alley with warm light from a single window', 'empty subway station with flickering fluorescent lights'],
  calming: ['soft city lights seen through rain on window glass', 'rooftop garden overlooking quiet evening city', 'cobblestone street with warm cafe light spilling out'],
  intense: ['neon-drenched cityscape with rain and reflections', 'time-lapse traffic light trails through dark city', 'dramatic thunderstorm over illuminated skyline'],
  hopeful: ['construction cranes silhouetted against sunrise sky', 'first commuters on bridge at dawn with golden light', 'fresh morning light hitting city buildings after rain'],
  melancholic: ['foggy empty street with distant blurred lights', 'abandoned lot with weeds growing through cracked concrete', 'single street lamp in heavy rain at night'],
  triumphant: ['fireworks exploding over city waterfront', 'aerial city view with dramatic sunset cloud formations', 'spotlights sweeping across night sky above buildings'],
  ethereal: ['city seen through heavy mist like a ghost town', 'reflection of city lights on perfectly still harbor', 'double exposure city and stars overlapping'],
};

const COSMIC_ELEMENTS: Record<string, string[]> = {
  empowering: ['supernova explosion in brilliant colors', 'massive galaxy spiral seen from above', 'solar flare erupting from the surface of a star'],
  reflective: ['earth seen from space at night with city lights', 'quiet asteroid field with distant sun', 'space station orbiting peacefully above clouds'],
  calming: ['gentle nebula clouds in soft pastel colors', 'slow orbit around a ringed gas giant planet', 'field of distant galaxies in deep space'],
  intense: ['black hole accretion disk with matter spiraling', 'two galaxies colliding in spectacular display', 'meteor shower streaking across atmosphere'],
  hopeful: ['new star forming in a stellar nursery', 'sunrise seen from orbit above earth', 'comet trail stretching across star field'],
  melancholic: ['lone planet drifting through empty space', 'dying red giant star in fading light', 'distant earth as tiny pale blue dot'],
  triumphant: ['pulsar beacon sweeping through dark space', 'star system forming from cosmic dust cloud', 'spacecraft emerging from warp with light trails'],
  ethereal: ['nebula pillars of creation in vivid detail', 'cosmic web structure connecting galaxies', 'quantum foam at the edge of reality'],
};

const MOTION_DESCRIPTIONS: Record<string, string> = {
  slow_drift: 'slow continuous gentle drift forward',
  float: 'weightless floating motion with subtle rotation',
  parallax: 'layered parallax movement with depth',
  pulse: 'rhythmic gentle pulsing motion',
  orbit: 'slow orbital rotating movement',
  zoom: 'very gradual zoom creating depth',
  static: 'mostly static with subtle atmospheric movement',
};

const STYLE_MAP: Record<string, Record<string, string[]>> = {
  nature: NATURE_ELEMENTS,
  abstract: ABSTRACT_ELEMENTS,
  urban: URBAN_ELEMENTS,
  cosmic: COSMIC_ELEMENTS,
  minimal: ABSTRACT_ELEMENTS, // reuse with different framing
  organic: NATURE_ELEMENTS,   // reuse with macro framing
};

function generatePrompt(category: string, mood: string, style: string, motionType: string, colorPalette?: string): { title: string; prompt: string } {
  const elements = STYLE_MAP[style]?.[mood] || STYLE_MAP.nature[mood] || NATURE_ELEMENTS.calming;
  const element = elements[Math.floor(Math.random() * elements.length)];
  const motion = MOTION_DESCRIPTIONS[motionType] || MOTION_DESCRIPTIONS.slow_drift;

  const colorNote = colorPalette ? `, color palette of ${colorPalette}` : '';
  const minimalPrefix = style === 'minimal' ? 'Clean minimal composition of ' : '';
  const organicPrefix = style === 'organic' ? 'Extreme macro close-up of ' : '';
  const prefix = minimalPrefix || organicPrefix || '';

  const prompt = `${prefix}${element}, ${motion}${colorNote}, vertical nine sixteen format, seamless loop, center area clean for captions, no text logos or faces, ${mood} ${category.replace(/_/g, ' ')} atmosphere`;

  // Generate title from the element description
  const words = element.split(' ').slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1));
  const title = words.join(' ');

  return { title, prompt };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, mood, style, motion_type, color_palette, count = 1 } = body;

  if (!category || !mood || !style) {
    return NextResponse.json({ error: 'category, mood, and style are required' }, { status: 400 });
  }

  const results = [];
  for (let i = 0; i < Math.min(count, 20); i++) {
    results.push(generatePrompt(category, mood, style, motion_type || 'slow_drift', color_palette));
  }

  return NextResponse.json({ prompts: results });
}
