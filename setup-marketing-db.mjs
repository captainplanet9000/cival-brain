import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres.vusjcfushwxwksfuszjv:Funxtion90!@aws-1-us-west-1.pooler.supabase.com:5432/postgres' });

await c.connect();

await c.query(`
  CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    business_unit_id UUID REFERENCES ops_business_units(id),
    status TEXT NOT NULL DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2) DEFAULT 0,
    goals JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS marketing_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL DEFAULT 'tiktok',
    platform TEXT NOT NULL DEFAULT 'tiktok',
    status TEXT NOT NULL DEFAULT 'idea',
    business_unit_id UUID REFERENCES ops_business_units(id),
    campaign_id UUID REFERENCES marketing_campaigns(id),
    script TEXT,
    caption TEXT,
    hashtags TEXT[] DEFAULT '{}',
    media_urls JSONB DEFAULT '[]',
    thumbnail_url TEXT,
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    published_url TEXT,
    performance JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS marketing_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    handle TEXT,
    business_unit_id UUID REFERENCES ops_business_units(id),
    status TEXT DEFAULT 'active',
    followers INT DEFAULT 0,
    profile_url TEXT,
    api_connected BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS marketing_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES marketing_channels(id),
    content_id UUID REFERENCES marketing_content(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    followers_gained INT DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);

// Enable RLS
for (const t of ['marketing_campaigns','marketing_content','marketing_channels','marketing_performance']) {
  await c.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  try {
    await c.query(`CREATE POLICY "allow_all_${t}" ON ${t} FOR ALL USING (true) WITH CHECK (true)`);
  } catch(e) { console.log('Policy exists for', t); }
}

// Seed channels
const bus = await c.query('SELECT id, name FROM ops_business_units');
console.log('Business units:', bus.rows.map(r => r.name));

const buMap = {};
for (const r of bus.rows) buMap[r.name] = r.id;

const channels = [
  { name: 'Honey Bunny TikTok', platform: 'tiktok', handle: '@honeybunny', bu: 'Honey Bunny' },
  { name: 'Clay Verse TikTok', platform: 'tiktok', handle: '@clayverse', bu: 'Clay Verse' },
  { name: 'Hunni Bunni Kitchen TikTok', platform: 'tiktok', handle: '@hunnibunnikitchen', bu: 'Hunni Bunni Kitchen' },
  { name: 'What I Need to Hear TikTok', platform: 'tiktok', handle: '@whatineedtohear', bu: 'What I Need to Hear' },
  { name: 'GWDS Twitter/X', platform: 'twitter', handle: '@gwds_studio', bu: 'GWDS' },
  { name: 'GWDS TikTok 1', platform: 'tiktok', handle: '@gwds1', bu: 'GWDS' },
  { name: 'GWDS TikTok 2', platform: 'tiktok', handle: '@gwds2', bu: 'GWDS' },
  { name: 'GWDS TikTok 3', platform: 'tiktok', handle: '@gwds3', bu: 'GWDS' },
  { name: 'The 400 Club Twitter/X', platform: 'twitter', handle: '@the400club', bu: 'The 400 Club' },
  { name: 'Cival Systems Twitter/X', platform: 'twitter', handle: '@civalsystems', bu: 'Cival Systems' },
];

for (const ch of channels) {
  const buId = buMap[ch.bu] || null;
  await c.query(
    `INSERT INTO marketing_channels (name, platform, handle, business_unit_id) 
     SELECT $1, $2, $3, $4 
     WHERE NOT EXISTS (SELECT 1 FROM marketing_channels WHERE handle = $3 AND platform = $2)`,
    [ch.name, ch.platform, ch.handle, buId]
  );
}

console.log('Done!');
await c.end();
