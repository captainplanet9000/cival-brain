const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres';

async function setupMemoryTables() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Supabase');

    // Create brain_memories table
    console.log('Creating brain_memories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS brain_memories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        tags TEXT[] DEFAULT '{}',
        agent_ids UUID[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        is_pinned BOOLEAN DEFAULT false,
        source TEXT,
        metadata JSONB DEFAULT '{}',
        token_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Create indexes for brain_memories
    console.log('Creating indexes for brain_memories...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_brain_memories_category ON brain_memories(category);
      CREATE INDEX IF NOT EXISTS idx_brain_memories_active ON brain_memories(is_active);
      CREATE INDEX IF NOT EXISTS idx_brain_memories_agent_ids ON brain_memories USING GIN(agent_ids);
      CREATE INDEX IF NOT EXISTS idx_brain_memories_tags ON brain_memories USING GIN(tags);
    `);

    // Enable RLS for brain_memories
    console.log('Enabling RLS for brain_memories...');
    await client.query(`
      ALTER TABLE brain_memories ENABLE ROW LEVEL SECURITY;
    `);
    
    await client.query(`
      DROP POLICY IF EXISTS "Allow all brain_memories" ON brain_memories;
      CREATE POLICY "Allow all brain_memories" ON brain_memories FOR ALL USING (true) WITH CHECK (true);
    `);

    // Create brain_memory_collections table
    console.log('Creating brain_memory_collections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS brain_memory_collections (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT '📁',
        color TEXT DEFAULT '#6366f1',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Enable RLS for brain_memory_collections
    console.log('Enabling RLS for brain_memory_collections...');
    await client.query(`
      ALTER TABLE brain_memory_collections ENABLE ROW LEVEL SECURITY;
    `);
    
    await client.query(`
      DROP POLICY IF EXISTS "Allow all brain_memory_collections" ON brain_memory_collections;
      CREATE POLICY "Allow all brain_memory_collections" ON brain_memory_collections FOR ALL USING (true) WITH CHECK (true);
    `);

    // Add collection_id to brain_memories
    console.log('Adding collection_id to brain_memories...');
    await client.query(`
      ALTER TABLE brain_memories ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES brain_memory_collections(id);
    `);

    // Seed default collections
    console.log('Seeding default collections...');
    await client.query(`
      INSERT INTO brain_memory_collections (name, description, icon, color, is_default) VALUES
        ('General Knowledge', 'Shared context available to all agents', '🧠', '#6366f1', true),
        ('Trading Strategy', 'Trading rules, strategies, risk parameters', '📈', '#10B981', false),
        ('Content Pipeline', 'TikTok channels, script frameworks, production guidelines', '🎬', '#F59E0B', false),
        ('Company Info', 'GWDS structure, projects, team, goals', '🏢', '#3B82F6', false),
        ('Technical Docs', 'Architecture, APIs, deployment, infrastructure', '⚙️', '#8B5CF6', false),
        ('User Preferences', 'Anthony''s preferences, communication style, priorities', '👤', '#EC4899', false)
      ON CONFLICT DO NOTHING;
    `);

    // Seed initial memories
    console.log('Seeding initial memories...');
    
    // Get the default collection ID
    const result = await client.query(`
      SELECT id FROM brain_memory_collections WHERE is_default = true LIMIT 1;
    `);
    const defaultCollectionId = result.rows[0]?.id;

    await client.query(`
      INSERT INTO brain_memories (title, content, category, tags, source, collection_id, token_count) VALUES
      ('Anthony''s Communication Style', 'Direct, concise responses. Show don''t tell. Quick turnarounds. OK with spawning sub-agents for big tasks. Prefers inline styles on dashboard. Wants real execution, no mock data.', 'preference', ARRAY['anthony', 'communication'], 'manual', $1, 38),
      ('Cival Systems Overview', 'Cival Systems is an autonomous AI trading platform built by Anthony Lee (GWDS). It runs 31 agents across 7 farms on Hyperliquid. The system uses Darvas, Williams, Elliott Wave, Renko, Heikin Ashi, and Multi-Strategy approaches. First live trades executed Feb 6, 2026.', 'project', ARRAY['cival', 'trading', 'hyperliquid'], 'manual', $1, 60),
      ('The Revenue Flywheel', 'Everything is a funnel into trading. Content, NFTs, products = capital generation → fed into Cival Systems → leveraged trading → compounding returns → more capital → repeat. TikTok (6 channels) → revenue → trading capital. NFTs (400 Club on ETH) → mint revenue → trading capital.', 'fact', ARRAY['strategy', 'revenue', 'flywheel'], 'manual', $1, 55),
      ('TikTok Channel List', 'Six TikTok channels: 1) Honey Bunny (motivational, Monroe''s Motivated Sequence), 2) Clay Verse (claymation fiction, 150 episodes), 3) Hunni Bunni Kitchen (3D cooking), 4) What I Need to Hear (affirmations, 100+ scripts), 5-6) Two GWDS channels (in development). Target: 5 vids/day per channel.', 'project', ARRAY['tiktok', 'content', 'channels'], 'manual', $1, 62),
      ('Trading Safety Limits', 'Max position: 30% available margin (cap $150). Max daily loss: $75. Max open positions: 12. Min position: $11 (Hyperliquid minimum is $10). Cycle interval: 300s (5min). LLM: OpenRouter → Gemini 2.5 Flash.', 'instruction', ARRAY['trading', 'safety', 'limits'], 'manual', $1, 50),
      ('Dashboard Architecture', 'Cival Dashboard v9 at C:\TradingFarm\Cival-Dashboard-v9. Next.js on port 9005. 17 tabs: Overview, Live Trading, Agents, Farms, Goals, Vault, DeFi Lending, Flash Loans, Liquidations, Position Risk, News, Performance, Trade Journal, Analytics, Meme Trading, Prop Firms, Settings. Supabase backend.', 'document', ARRAY['dashboard', 'architecture', 'infrastructure'], 'manual', $1, 58),
      ('400 Club NFT Status', 'Contract deployed on ETH: 0xA2E2eA98302e4Db471d16862468A0AFB0256a589. 9,400-piece collection. BLOCKER: metadata has placeholder CIDs — need Pinata upload → reveal() → unpause(). Estimated 2-4 hours to complete launch. Priority: get out ASAP.', 'project', ARRAY['nft', '400club', 'eth'], 'manual', $1, 50),
      ('Hyperliquid Wallet Config', 'Main wallet (funds): 0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2. API wallet (signer "Bossman"): 0x45a9A0E3afD0045dDA3095eBC969605c6cc246B8. Error 1033 = API wallet auth expired → fix at app.hyperliquid.xyz → Settings → API Wallets.', 'instruction', ARRAY['hyperliquid', 'wallet', 'config'], 'manual', $1, 50)
    `, [defaultCollectionId]);

    console.log('✅ Memory tables created and seeded successfully!');
  } catch (error) {
    console.error('Error setting up memory tables:', error);
    throw error;
  } finally {
    await client.end();
  }
}

setupMemoryTables();
