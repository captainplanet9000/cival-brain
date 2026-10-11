begin;
-- Private business tables: only verified server routes may read or mutate them.
do $$
declare name text;
begin
  foreach name in array array['ops_missions','ops_mission_steps','ops_agent_events',
    'ops_mission_proposals','ops_policy','ops_agent_memory','ops_agent_relationships',
    'ops_trigger_rules','ops_business_units','ops_content_pipeline','brain_tasks'] loop
    if to_regclass(format('public.%I', name)) is not null then
      execute format('alter table public.%I enable row level security', name);
      execute format('revoke all on public.%I from public, anon, authenticated', name);
      execute format('grant select, insert, update, delete on public.%I to service_role', name);
    end if;
  end loop;
end $$;

-- One database transaction creates both the mission and its ordered steps.
create or replace function public.create_brain_mission(mission jsonb, steps jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare created public.ops_missions%rowtype; step jsonb;
begin
  if jsonb_typeof(mission) <> 'object' or length(btrim(coalesce(mission->>'title',''))) not between 1 and 300 then
    raise exception 'Invalid mission title' using errcode='22023';
  end if;
  if coalesce(mission->>'status','approved') not in ('approved','in_progress','completed','failed','cancelled') then
    raise exception 'Invalid mission status' using errcode='22023';
  end if;
  if jsonb_typeof(steps) <> 'array' or jsonb_array_length(steps) > 100 then
    raise exception 'Invalid mission steps' using errcode='22023';
  end if;
  insert into public.ops_missions(title, status, created_by, proposal_id)
    values (mission->>'title', coalesce(mission->>'status','approved'), mission->>'created_by', (mission->>'proposal_id')::uuid)
    returning * into created;
  for step in select value from jsonb_array_elements(steps) loop
    if jsonb_typeof(step) <> 'object' or length(btrim(coalesce(step->>'kind',''))) not between 1 and 100 then
      raise exception 'Invalid mission step' using errcode='22023';
    end if;
    insert into public.ops_mission_steps(mission_id, kind, status, payload)
      values (created.id, step->>'kind', 'queued', coalesce(step->'payload','{}'::jsonb));
  end loop;
  return to_jsonb(created);
end $$;
revoke all on function public.create_brain_mission(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_brain_mission(jsonb,jsonb) to service_role;
commit;
