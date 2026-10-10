-- Only authenticated server routes access private tasks through service_role.
begin;
create table if not exists public.brain_tasks (
  id text primary key,
  title text not null check (length(btrim(title)) between 1 and 300),
  description text not null default '' check (length(description) <= 20000),
  status text not null default 'backlog' check (status in ('backlog','in-progress','review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  tags text[] not null default '{}' check (cardinality(tags) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brain_tasks_created_at_idx on public.brain_tasks(created_at);
alter table public.brain_tasks enable row level security;
revoke all on public.brain_tasks from public, anon, authenticated;
grant select, insert, update, delete on public.brain_tasks to service_role;
commit;
