-- Ops tables for GWDS multi-agent architecture
create extension if not exists "pgcrypto";

create table if not exists ops_mission_proposals (
  id uuid primary key default gen_random_uuid(),
  agent_id text,
  title text,
  status text default 'pending',
  proposed_steps jsonb,
  rejection_reason text,
  created_at timestamptz default now()
);

create table if not exists ops_missions (
  id uuid primary key default gen_random_uuid(),
  title text,
  status text default 'approved',
  created_by text,
  proposal_id uuid,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists ops_mission_steps (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references ops_missions(id) on delete cascade,
  kind text,
  status text default 'queued',
  payload jsonb,
  result jsonb,
  reserved_by text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists ops_agent_events (
  id uuid primary key default gen_random_uuid(),
  agent_id text,
  kind text,
  title text,
  summary text,
  tags text[],
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists ops_policy (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

create table if not exists ops_agent_memory (
  id uuid primary key default gen_random_uuid(),
  agent_id text,
  type text,
  content text,
  confidence numeric(3,2) default 0.60,
  tags text[],
  source_trace_id text,
  superseded_by uuid,
  created_at timestamptz default now()
);

create table if not exists ops_agent_relationships (
  id uuid primary key default gen_random_uuid(),
  agent_a text,
  agent_b text,
  affinity numeric(3,2) default 0.50,
  total_interactions int default 0,
  positive_interactions int default 0,
  negative_interactions int default 0,
  drift_log jsonb default '[]'::jsonb,
  unique(agent_a, agent_b),
  check(agent_a < agent_b)
);

create table if not exists ops_trigger_rules (
  id uuid primary key default gen_random_uuid(),
  name text,
  trigger_event text,
  conditions jsonb,
  action_config jsonb,
  cooldown_minutes int default 60,
  enabled boolean default true,
  fire_count int default 0,
  last_fired_at timestamptz
);

create table if not exists ops_business_units (
  id uuid primary key default gen_random_uuid(),
  name text,
  slug text unique,
  icon text,
  description text,
  status text default 'active',
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists ops_content_pipeline (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references ops_business_units(id) on delete set null,
  title text,
  stage text default 'idea',
  channel text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed policies
insert into ops_policy (key, value) values
  ('auto_approve', '{"enabled": true, "allowed_step_kinds": ["analyze", "draft_content", "research"]}'),
  ('content_daily_quota', '{"limit": 15}'),
  ('memory_influence', '{"enabled": true, "probability": 0.3}'),
  ('relationship_drift', '{"enabled": true, "max_drift": 0.03}')
on conflict (key) do nothing;

-- Seed business units
insert into ops_business_units (name, slug, icon, description) values
  ('Cival Dashboard', 'cival-dashboard', '📊', 'Trading platform and analytics'),
  ('Honey Bunny', 'honey-bunny', '🐰', 'Honey Bunny brand'),
  ('Clay Verse', 'clay-verse', '🎨', 'Clay Verse NFT collection'),
  ('Hunni Bunni Kitchen', 'hunni-bunni-kitchen', '🍳', 'Cooking content brand'),
  ('What I Need to Hear', 'what-i-need-to-hear', '🎧', 'Motivational content'),
  ('GWDS TikTok 1', 'gwds-tiktok-1', '📱', 'TikTok channel 1'),
  ('GWDS TikTok 2', 'gwds-tiktok-2', '📱', 'TikTok channel 2'),
  ('GWDS TikTok 3', 'gwds-tiktok-3', '📱', 'TikTok channel 3'),
  ('The 400 Club', 'the-400-club', '🏆', 'Exclusive community')
on conflict (slug) do nothing;

-- Seed starter agent events
insert into ops_agent_events (agent_id, kind, title, summary, tags) values
  ('coordinator', 'agent_online', 'Coordinator Online', 'Manages priorities across all GWDS business units', '{"system", "coordinator"}'),
  ('content-creator', 'agent_online', 'Content Creator Online', 'Manages TikTok content pipeline across all channels', '{"system", "content"}'),
  ('observer', 'agent_online', 'Observer Online', 'Monitors system health, reviews outcomes, writes lessons', '{"system", "observer"}');
