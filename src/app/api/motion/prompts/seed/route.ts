import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const presetPrompts = [
  {
    title: 'SaaS Product Launch',
    category: 'launch',
    prompt_text: 'Create a cinematic product launch video. Start with a dark gradient background, reveal the company logo with a particle burst effect. Show the product name in large bold typography with a typewriter animation. Transition to feature highlights with slide-in cards. End with a call-to-action and website URL.',
    tags: ['saas', 'launch', 'cinematic'],
    scene_template: {
      sequences: [
        { name: 'LogoReveal', type: 'logo-reveal', duration: 5 },
        { name: 'ProductTitle', type: 'typing-demo', duration: 6 },
        { name: 'Features', type: 'split-screen', duration: 12 },
        { name: 'CTA', type: 'call-to-action', duration: 5 }
      ]
    }
  },
  {
    title: 'Mobile App Demo',
    category: 'demo',
    prompt_text: 'Create a clean minimal app demo video. Show a phone mockup centered on screen. Demonstrate the app with typing prompts and generated screens. Use soft transitions between screens. Light on dark aesthetic. End with download CTA.',
    tags: ['mobile', 'app', 'demo', 'clean'],
    scene_template: {}
  },
  {
    title: 'AI Tool Showcase',
    category: 'showcase',
    prompt_text: 'Create a futuristic AI tool showcase. Particle background animation. Neural network node visualization. Show prompts being typed and AI responses generating in real-time. Glowing accent colors. Data flowing effects.',
    tags: ['ai', 'futuristic', 'tech'],
    scene_template: {}
  },
  {
    title: 'TikTok Product Promo',
    category: 'tiktok',
    prompt_text: 'Create a fast-paced 15-second TikTok promo. Bold text slams in from sides. Quick cuts between product shots. Punchy sound effects on each transition. End with brand logo zoom. Vertical 9:16 format.',
    tags: ['tiktok', 'short', 'punchy'],
    scene_template: {}
  },
  {
    title: 'NFT Collection Reveal',
    category: 'nft',
    prompt_text: 'Create an ethereal NFT collection reveal. Start with a mysterious dark void. Slowly reveal artwork pieces floating in 3D space. Holographic shimmer effects. Show collection name in futuristic font. Include mint details and chain logo.',
    tags: ['nft', 'web3', 'crypto', 'art'],
    scene_template: {}
  },
  {
    title: 'Dashboard Analytics Demo',
    category: 'demo',
    prompt_text: 'Create a professional dashboard demo. Show a data-rich dashboard building itself piece by piece. Charts animate in, numbers count up, cards slide in. Clean corporate aesthetic with blue accents. End with company branding.',
    tags: ['dashboard', 'data', 'analytics'],
    scene_template: {}
  },
  {
    title: 'Startup Pitch Video',
    category: 'launch',
    prompt_text: 'Create an inspiring startup pitch video. Start with the problem statement in bold text. Transition to solution with product reveal. Show traction metrics counting up. Team/founder name. End with investment CTA or website.',
    tags: ['startup', 'pitch', 'investors'],
    scene_template: {}
  },
  {
    title: 'E-commerce Product Showcase',
    category: 'showcase',
    prompt_text: 'Create a warm lifestyle product showcase. Product image centered with soft glow. Feature callouts animate around the product. Price reveal with subtle animation. Customer rating stars filling in. Buy now CTA.',
    tags: ['ecommerce', 'product', 'retail'],
    scene_template: {}
  },
  {
    title: 'Developer Tool Launch',
    category: 'launch',
    prompt_text: 'Create a developer-focused launch video. Terminal aesthetic with monospace font. Show code being typed with syntax highlighting. Command line outputs scrolling. GitHub stars counter. Install command prominently displayed.',
    tags: ['developer', 'code', 'terminal'],
    scene_template: {}
  },
  {
    title: 'Brand Identity Reveal',
    category: 'showcase',
    prompt_text: 'Create an elegant brand identity reveal. Start with abstract shape morphing into logo. Typography showcase with brand font. Color palette reveal with swatches expanding. Tagline appearing with elegant serif font.',
    tags: ['brand', 'identity', 'elegant'],
    scene_template: {}
  },
  {
    title: 'Social Media Ad',
    category: 'tiktok',
    prompt_text: 'Create a scroll-stopping social media ad. Hook text in first 2 seconds. Bold contrasting colors. Product/offer in center. Urgency text (limited time). Clear CTA button animation. Works for Instagram Reels and TikTok.',
    tags: ['social', 'ad', 'conversion'],
    scene_template: {}
  },
  {
    title: 'Educational Explainer',
    category: 'explainer',
    prompt_text: 'Create a friendly step-by-step explainer video. Numbered steps appearing one by one. Simple iconography for each concept. Progress bar at top. Warm encouraging tone in text. Summary screen at the end.',
    tags: ['education', 'tutorial', 'howto'],
    scene_template: {}
  },
  {
    title: 'Crypto/DeFi Platform',
    category: 'launch',
    prompt_text: 'Create a futuristic DeFi platform launch video. Blockchain visualization with connected nodes. Token symbol reveal with glow effect. APY numbers animating. Security shield icon. Available chains logos scrolling.',
    tags: ['crypto', 'defi', 'blockchain'],
    scene_template: {}
  },
  {
    title: 'Gaming Trailer',
    category: 'showcase',
    prompt_text: 'Create a high-energy gaming trailer. Fast cuts with camera shake effects. Bold impact text slamming in. Fire/particle effects. Character/gameplay screenshots with zoom transitions. Release date with countdown feel.',
    tags: ['gaming', 'trailer', 'action'],
    scene_template: {}
  },
  {
    title: 'Podcast/Series Intro',
    category: 'explainer',
    prompt_text: 'Create a personality-driven series intro. Host name in stylized text. Show/podcast title with subtle animation. Episode format hint. Social media handles sliding in. Consistent brand colors throughout. 10 seconds max.',
    tags: ['podcast', 'series', 'intro'],
    scene_template: {}
  }
];

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();

  const results = [];
  for (const preset of presetPrompts) {
    const { data: existing } = await sb
      .from('motion_prompts')
      .select('id')
      .eq('title', preset.title)
      .single();

    if (!existing) {
      const { data, error } = await sb
        .from('motion_prompts')
        .insert(preset)
        .select()
        .single();

      results.push({ title: preset.title, status: error ? 'error' : 'created', error: error?.message });
    } else {
      results.push({ title: preset.title, status: 'exists' });
    }
  }

  return NextResponse.json({ results, total: presetPrompts.length });
}
