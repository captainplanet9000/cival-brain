const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = 'https://vusjcfushwxwksfuszjv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const CATEGORIES = [
  'pre_interview', 'pre_test', 'performance', 'mental_clarity', 'self_belief',
  'morning_power', 'evening_reflection', 'stress_relief', 'confidence_boost',
  'resilience', 'gratitude', 'focus', 'creativity', 'courage', 'self_worth',
  'healing', 'transformation', 'abundance', 'universal'
];

const MOODS = ['empowering', 'calm', 'energetic', 'mystical', 'warm', 'dramatic', 'ethereal', 'contemplative'];
const STYLES = ['nature', 'abstract', 'urban', 'cosmic', 'minimal', 'organic'];
const MOTION_TYPES = ['slow_drift', 'float', 'parallax', 'pulse', 'orbit', 'zoom', 'static'];

const COLOR_PALETTES = [
  'Deep navy and gold stars',
  'Soft lavender and cream',
  'Emerald green and forest shadows',
  'Rose gold and blush pink',
  'Midnight blue and silver',
  'Warm amber and copper',
  'Cool teal and aquamarine',
  'Rich burgundy and champagne',
  'Sage green and ivory',
  'Indigo and violet gradients',
  'Golden hour oranges and pinks',
  'Crisp white and ice blue',
  'Charcoal and platinum',
  'Coral and turquoise',
  'Deep purple and magenta',
  'Warm honey and caramel',
  'Ocean blues and seafoam',
  'Sunset reds and oranges',
  'Misty grays and soft whites',
  'Rich browns and autumn golds'
];

// Prompt templates organized by style and mood
const PROMPT_TEMPLATES = {
  nature: {
    calm: [
      'Gentle waterfall cascading over moss-covered rocks in slow motion, {color_palette}, soft mist rising, camera slowly orbiting the falls, dappled sunlight filtering through canopy, 9:16 vertical, seamless loop',
      'Serene forest floor with sunbeams penetrating through tall trees, {color_palette}, floating particles in light rays, slow upward camera drift, ferns swaying gently, 9:16 vertical, perfect loop',
      'Peaceful ocean waves lapping against smooth stones, {color_palette}, rhythmic water motion, subtle camera sway, horizon line stable for text overlay, 9:16 vertical, endless loop',
      'Tranquil meadow with wildflowers swaying in gentle breeze, {color_palette}, soft focus bokeh background, slow pan across field, golden hour lighting, 9:16 vertical, loopable',
      'Calm mountain lake reflection at dawn, {color_palette}, mirror-like water surface, subtle ripples expanding outward, static camera with slow zoom, 9:16 vertical, seamless'
    ],
    empowering: [
      'Powerful ocean waves crashing with dramatic spray, {color_palette}, dynamic water motion, slow-motion capture, camera rising from water level, dramatic clouds overhead, 9:16 vertical, loops perfectly',
      'Majestic mountain peak with moving clouds, {color_palette}, time-lapse cloud flow, camera slowly ascending, sunbeams breaking through, epic scale, 9:16 vertical, continuous loop',
      'Thundering waterfall with rainbow mist, {color_palette}, powerful water cascade, camera orbiting at distance, spray catching light, dramatic energy, 9:16 vertical, seamless',
      'Ancient redwood forest looking upward, {color_palette}, towering trunks converging skyward, slow circular camera rotation, sense of grandeur, 9:16 vertical, perfect loop',
      'Volcanic landscape with steam vents, {color_palette}, rising vapor columns, slow drift across terrain, primal power, dramatic lighting, 9:16 vertical, loopable'
    ],
    mystical: [
      'Enchanted forest with fireflies dancing, {color_palette}, glowing particles floating through trees, gentle camera drift, magical atmosphere, twilight shadows, 9:16 vertical, loops seamlessly',
      'Mysterious fog rolling through ancient trees, {color_palette}, ethereal mist movement, slow forward drift, diffused lighting, dreamlike quality, 9:16 vertical, continuous',
      'Bioluminescent mushrooms glowing in dark forest, {color_palette}, pulsing organic light, static camera with subtle zoom, mystical ambiance, 9:16 vertical, perfect loop',
      'Moonlit forest path with dancing shadows, {color_palette}, dappled moonlight patterns, gentle camera sway, mysterious depth, 9:16 vertical, seamless loop',
      'Crystal-clear stream with light refracting underwater, {color_palette}, liquid light patterns, slow camera follow downstream, magical sparkles, 9:16 vertical, loopable'
    ]
  },
  abstract: {
    energetic: [
      'Dynamic particle system with swirling energy, {color_palette}, fast-moving geometric patterns, orbital camera motion, vibrant pulsing rhythm, 9:16 vertical, seamless loop',
      'Flowing liquid metal textures morphing, {color_palette}, reflective surfaces undulating, slow rotation, energetic movement, 9:16 vertical, perfect loop',
      'Colorful paint explosions in slow motion, {color_palette}, fluid dynamics, radial burst patterns, camera zoom out, vibrant energy, 9:16 vertical, loops continuously',
      'Geometric shapes assembling and dissolving, {color_palette}, rhythmic transformation, parallax camera movement, modern aesthetic, 9:16 vertical, seamless',
      'Kinetic light trails forming patterns, {color_palette}, sweeping luminous lines, orbital motion, electric energy, 9:16 vertical, continuous loop'
    ],
    ethereal: [
      'Soft gradient clouds drifting slowly, {color_palette}, dreamy atmosphere, gentle float motion, pastel transitions, peaceful flow, 9:16 vertical, perfect loop',
      'Delicate ink drops dispersing in water, {color_palette}, organic fluid motion, slow-motion capture, gentle camera drift, meditative quality, 9:16 vertical, seamless',
      'Translucent fabric flowing in zero gravity, {color_palette}, weightless undulation, slow rotation, silky textures, graceful movement, 9:16 vertical, loopable',
      'Soft light beams through atmospheric haze, {color_palette}, volumetric lighting, gentle pulsing, static camera, transcendent mood, 9:16 vertical, continuous',
      'Prismatic light refractions dancing, {color_palette}, rainbow spectrum shifts, slow drift motion, crystalline quality, 9:16 vertical, seamless loop'
    ],
    contemplative: [
      'Minimalist geometric patterns slowly morphing, {color_palette}, subtle transformations, meditative rhythm, centered composition, 9:16 vertical, perfect loop',
      'Sand mandalas forming and dissolving, {color_palette}, time-lapse creation, circular symmetry, philosophical depth, 9:16 vertical, seamless',
      'Ripple patterns expanding in concentric circles, {color_palette}, hypnotic repetition, centered perspective, calm progression, 9:16 vertical, continuous loop',
      'Smooth gradient transitions between colors, {color_palette}, slow color breathing, minimal motion, reflective mood, 9:16 vertical, loopable',
      'Abstract ink paintings evolving slowly, {color_palette}, fluid brush strokes, contemplative pacing, artistic depth, 9:16 vertical, seamless'
    ]
  },
  cosmic: {
    mystical: [
      'Nebula clouds swirling with stardust, {color_palette}, cosmic gases flowing, slow orbital camera, infinite depth, glowing particles, 9:16 vertical, perfect loop',
      'Galaxy spiral arms rotating slowly, {color_palette}, millions of stars, gentle rotation, vast scale, cosmic wonder, 9:16 vertical, seamless',
      'Aurora borealis dancing across night sky, {color_palette}, undulating light curtains, slow drift motion, ethereal beauty, 9:16 vertical, continuous loop',
      'Planetary rings with cosmic dust, {color_palette}, orbital motion, space debris flowing, majestic scale, 9:16 vertical, loopable',
      'Supernova remnant expanding, {color_palette}, stellar gases dispersing, slow radial growth, cosmic birth, 9:16 vertical, seamless loop'
    ],
    dramatic: [
      'Black hole event horizon with accretion disk, {color_palette}, swirling matter, orbital motion, intense gravity visualization, 9:16 vertical, perfect loop',
      'Solar flares erupting from star surface, {color_palette}, plasma ejections, dynamic energy, slow-motion cosmic violence, 9:16 vertical, seamless',
      'Asteroid field drifting through space, {color_palette}, rocks tumbling slowly, camera weaving through, dramatic scale, 9:16 vertical, continuous',
      'Supermassive star pulsating, {color_palette}, rhythmic expansion, intense luminosity, hypnotic beat, 9:16 vertical, loopable',
      'Wormhole tunnel warping spacetime, {color_palette}, spiraling vortex, forward camera motion, mind-bending geometry, 9:16 vertical, seamless'
    ],
    contemplative: [
      'Distant galaxies slowly drifting, {color_palette}, deep space vista, minimal motion, infinite perspective, meditative vastness, 9:16 vertical, perfect loop',
      'Earth from space with slow rotation, {color_palette}, blue marble turning, clouds drifting, philosophical perspective, 9:16 vertical, seamless',
      'Star field with subtle parallax motion, {color_palette}, gentle camera drift, countless stars, cosmic solitude, 9:16 vertical, continuous',
      'Moon phases cycling slowly, {color_palette}, celestial rhythm, centered composition, time passage, 9:16 vertical, loopable',
      'Cosmic web structure visualization, {color_palette}, universal connections, slow zoom out, interconnected beauty, 9:16 vertical, seamless'
    ]
  },
  urban: {
    energetic: [
      'City lights bokeh at night, {color_palette}, out-of-focus urban glow, slow camera drift, vibrant energy, no readable text, 9:16 vertical, perfect loop',
      'Abstract architectural glass reflections, {color_palette}, warped building facades, slow pan motion, modern dynamism, 9:16 vertical, seamless',
      'Light trails from traffic in time-lapse, {color_palette}, flowing luminous streaks, static camera, urban pulse, no vehicles visible, 9:16 vertical, continuous',
      'Rainy window with city lights blurred, {color_palette}, water droplets racing, bokeh background, moody atmosphere, 9:16 vertical, loopable',
      'Neon reflections in wet pavement, {color_palette}, abstract color pools, slow camera movement, vibrant nightlife, 9:16 vertical, seamless'
    ],
    dramatic: [
      'Storm clouds over urban skyline silhouette, {color_palette}, dramatic sky movement, static foreground, powerful atmosphere, no identifiable buildings, 9:16 vertical, perfect loop',
      'Subway tunnel abstract light patterns, {color_palette}, rushing luminous lines, forward motion blur, urban velocity, 9:16 vertical, seamless',
      'Fire escape shadows with dramatic lighting, {color_palette}, geometric patterns, slow pan, film noir mood, 9:16 vertical, continuous',
      'Construction crane silhouette at sunset, {color_palette}, strong geometric forms, sky color transitions, industrial power, 9:16 vertical, loopable',
      'Bridge cables perspective looking up, {color_palette}, converging lines, slow camera tilt, architectural drama, 9:16 vertical, seamless'
    ],
    minimal: [
      'Clean concrete textures with subtle shadows, {color_palette}, minimalist surfaces, gentle light shift, architectural simplicity, 9:16 vertical, perfect loop',
      'White marble patterns and veining, {color_palette}, stone texture close-up, minimal motion, elegant simplicity, 9:16 vertical, seamless',
      'Abstract metal reflections, {color_palette}, brushed steel surfaces, slow camera drift, industrial minimalism, 9:16 vertical, continuous',
      'Glass and steel geometric abstractions, {color_palette}, clean lines intersecting, subtle parallax, modern zen, 9:16 vertical, loopable',
      'Shadow patterns on white walls, {color_palette}, time-lapse light movement, minimalist composition, contemplative, 9:16 vertical, seamless'
    ]
  },
  minimal: {
    calm: [
      'Soft gradient breathing animation, {color_palette}, gentle color transitions, subtle pulsing, meditative simplicity, 9:16 vertical, perfect loop',
      'Single leaf floating on still water, {color_palette}, minimal ripples, centered composition, zen-like calm, 9:16 vertical, seamless',
      'Clean paper texture with soft lighting, {color_palette}, subtle shadows shifting, minimal movement, peaceful backdrop, 9:16 vertical, continuous',
      'Smooth sand dunes with wind patterns, {color_palette}, gentle texture movement, slow drift, natural minimalism, 9:16 vertical, loopable',
      'White clouds on pale sky, {color_palette}, slow cloud drift, clean composition, serene simplicity, 9:16 vertical, seamless'
    ],
    contemplative: [
      'Zen garden rake patterns, {color_palette}, concentric circles in sand, slow reveal, meditative geometry, 9:16 vertical, perfect loop',
      'Water droplet creating ripples, {color_palette}, expanding circles, centered impact, philosophical moment, 9:16 vertical, seamless',
      'Single flower petal falling slowly, {color_palette}, graceful descent, soft lighting, impermanence meditation, 9:16 vertical, continuous',
      'Breathing rhythm visualization, {color_palette}, expanding and contracting form, meditative pacing, 9:16 vertical, loopable',
      'Minimal geometric rotation, {color_palette}, simple shape turning, hypnotic rhythm, contemplative focus, 9:16 vertical, seamless'
    ],
    warm: [
      'Soft candle flame flickering, {color_palette}, gentle light dance, intimate warmth, cozy atmosphere, 9:16 vertical, perfect loop',
      'Warm fabric textures with soft folds, {color_palette}, gentle undulation, comforting tactility, 9:16 vertical, seamless',
      'Tea steam rising in soft light, {color_palette}, delicate vapor patterns, warm invitation, 9:16 vertical, continuous',
      'Sunset glow on simple surface, {color_palette}, warm color wash, gentle fade, comforting presence, 9:16 vertical, loopable',
      'Soft wool textures close-up, {color_palette}, minimal movement, tactile warmth, cozy minimalism, 9:16 vertical, seamless'
    ]
  },
  organic: {
    warm: [
      'Honey dripping in slow motion, {color_palette}, viscous golden flow, smooth pour, warm sweetness, 9:16 vertical, perfect loop',
      'Wood grain patterns with warm lighting, {color_palette}, natural texture close-up, subtle camera drift, earthy comfort, 9:16 vertical, seamless',
      'Autumn leaves floating gently down, {color_palette}, spiraling descent, warm seasonal colors, peaceful fall, 9:16 vertical, continuous',
      'Clay pottery wheel turning, {color_palette}, wet earth forming, centered rotation, tactile creation, 9:16 vertical, loopable',
      'Wheat field swaying in warm breeze, {color_palette}, golden waves, gentle motion, harvest abundance, 9:16 vertical, seamless'
    ],
    calm: [
      'Flower petals opening time-lapse, {color_palette}, gentle blooming, natural rhythm, life unfolding, 9:16 vertical, perfect loop',
      'Bamboo forest with gentle sway, {color_palette}, vertical stalks moving, peaceful rustling, zen garden, 9:16 vertical, seamless',
      'Moss growing on stones close-up, {color_palette}, textured organic surface, minimal motion, nature\'s patience, 9:16 vertical, continuous',
      'Palm fronds swaying slowly, {color_palette}, tropical rhythm, gentle breeze, relaxed paradise, 9:16 vertical, loopable',
      'Dandelion seeds floating away, {color_palette}, weightless drift, gentle release, natural meditation, 9:16 vertical, seamless'
    ],
    ethereal: [
      'Cherry blossom petals falling, {color_palette}, delicate pink snow, gentle descent, fleeting beauty, 9:16 vertical, perfect loop',
      'Spider web with morning dew, {color_palette}, prismatic droplets, delicate structure, magical detail, 9:16 vertical, seamless',
      'Butterfly wings in slow motion, {color_palette}, iridescent patterns, graceful flutter, transformative beauty, 9:16 vertical, continuous',
      'Cattail seeds dispersing, {color_palette}, fluffy white drift, gentle release, dreamy dissemination, 9:16 vertical, loopable',
      'Jellyfish pulsating gracefully, {color_palette}, translucent bells, rhythmic flow, underwater ballet, 9:16 vertical, seamless'
    ]
  }
};

// Tag pools for variety
const TAG_POOLS = {
  nature: ['forest', 'water', 'mountains', 'trees', 'wilderness', 'natural', 'earth', 'sky', 'clouds', 'landscape'],
  abstract: ['modern', 'artistic', 'geometric', 'fluid', 'dynamic', 'contemporary', 'design', 'motion', 'pattern', 'visual'],
  cosmic: ['space', 'stars', 'galaxy', 'universe', 'celestial', 'astronomy', 'infinite', 'cosmic', 'stellar', 'nebula'],
  urban: ['city', 'architecture', 'modern', 'contemporary', 'minimal', 'industrial', 'sleek', 'urban', 'nightlife', 'lights'],
  minimal: ['simple', 'clean', 'zen', 'minimal', 'pure', 'subtle', 'elegant', 'refined', 'calm', 'peaceful'],
  organic: ['natural', 'growth', 'life', 'earth', 'botanical', 'flora', 'texture', 'organic', 'living', 'authentic'],
  general: ['loopable', 'seamless', 'background', 'vertical', 'tiktok', 'motivational', 'atmospheric', 'cinematic', 'smooth', 'professional']
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generatePrompt(category, index) {
  const style = getRandomElement(STYLES);
  const mood = getRandomElement(MOODS);
  const motionType = getRandomElement(MOTION_TYPES);
  const colorPalette = getRandomElement(COLOR_PALETTES);
  
  // Get prompt template based on style and mood
  let promptText;
  if (PROMPT_TEMPLATES[style] && PROMPT_TEMPLATES[style][mood]) {
    const templates = PROMPT_TEMPLATES[style][mood];
    promptText = getRandomElement(templates).replace('{color_palette}', colorPalette);
  } else {
    // Fallback generic prompt
    promptText = `Abstract ${style} composition with ${mood} atmosphere, ${colorPalette}, smooth ${motionType} camera movement, cinematic lighting, loopable background, 9:16 vertical format, seamless loop, caption-safe composition`;
  }
  
  // Generate varied title
  const titlePrefixes = ['Serene', 'Dynamic', 'Ethereal', 'Tranquil', 'Powerful', 'Mystical', 'Vibrant', 'Peaceful', 'Epic', 'Gentle', 'Bold', 'Dreamy', 'Majestic', 'Soft', 'Intense'];
  const titleSuffixes = ['Background', 'Loop', 'Motion', 'Flow', 'Vision', 'Scene', 'Atmosphere', 'Canvas', 'Backdrop', 'Vista'];
  const title = `${getRandomElement(titlePrefixes)} ${style.charAt(0).toUpperCase() + style.slice(1)} ${getRandomElement(titleSuffixes)} ${index + 1}`;
  
  // Generate tags
  const styleTags = TAG_POOLS[style] || TAG_POOLS.general;
  const tags = [
    ...getRandomElements(styleTags, 3),
    ...getRandomElements(TAG_POOLS.general, 3),
    mood,
    style,
    category.replace('_', '-')
  ];
  
  return {
    title,
    prompt: promptText,
    category,
    subcategory: null,
    mood,
    style,
    color_palette: colorPalette,
    motion_type: motionType,
    format: '9:16',
    loop_friendly: true,
    caption_safe: true,
    platform: 'higgsfield',
    tags: [...new Set(tags)], // Remove duplicates
    status: 'draft',
    usage_count: 0,
    notes: `Generated for ${category} category - ${mood} ${style} composition`
  };
}

async function seedPrompts() {
  console.log('🎬 Starting seed process for 500 background prompts...\n');
  
  const totalPrompts = 500;
  const promptsPerCategory = Math.ceil(totalPrompts / CATEGORIES.length);
  const allPrompts = [];
  
  // Generate prompts distributed across categories
  let promptIndex = 0;
  for (const category of CATEGORIES) {
    const categoryCount = Math.min(promptsPerCategory, totalPrompts - promptIndex);
    console.log(`📁 Generating ${categoryCount} prompts for "${category}"...`);
    
    for (let i = 0; i < categoryCount; i++) {
      allPrompts.push(generatePrompt(category, promptIndex));
      promptIndex++;
      
      if (promptIndex >= totalPrompts) break;
    }
    
    if (promptIndex >= totalPrompts) break;
  }
  
  console.log(`\n✅ Generated ${allPrompts.length} prompts\n`);
  console.log('📤 Inserting into Supabase in batches of 50...\n');
  
  // Insert in batches of 50
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < allPrompts.length; i += batchSize) {
    const batch = allPrompts.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(allPrompts.length / batchSize);
    
    try {
      const { data, error } = await supabase
        .from('background_prompts')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Batch ${batchNumber}/${totalBatches} failed:`, error.message);
        errorCount += batch.length;
      } else {
        console.log(`✅ Batch ${batchNumber}/${totalBatches} inserted successfully (${batch.length} prompts)`);
        successCount += batch.length;
      }
    } catch (err) {
      console.error(`❌ Batch ${batchNumber}/${totalBatches} exception:`, err.message);
      errorCount += batch.length;
    }
    
    // Small delay between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEED SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully inserted: ${successCount} prompts`);
  console.log(`❌ Failed: ${errorCount} prompts`);
  console.log(`📁 Categories: ${CATEGORIES.length}`);
  console.log(`🎨 Moods: ${MOODS.join(', ')}`);
  console.log(`🖼️  Styles: ${STYLES.join(', ')}`);
  console.log(`🎬 Motion types: ${MOTION_TYPES.join(', ')}`);
  console.log('='.repeat(60));
  
  // Verify count in database
  try {
    const { count, error } = await supabase
      .from('background_prompts')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('⚠️  Could not verify database count:', error.message);
    } else {
      console.log(`\n🗄️  Total prompts in database: ${count}`);
    }
  } catch (err) {
    console.error('⚠️  Could not verify database count:', err.message);
  }
  
  console.log('\n✨ Seed process complete!\n');
}

// Run the seed
seedPrompts().catch(console.error);
