-- Run only against a disposable local brain_repair_test database.
begin;
set local role service_role;
do $$
declare test_result jsonb; before_count bigint;
begin
  test_result := public.create_brain_mission('{"title":"Atomic mission test","created_by":"test"}', '[{"kind":"research"},{"kind":"draft","payload":{"test":true}}]');
  if (select count(*) from public.ops_mission_steps where mission_id=(test_result->>'id')::uuid) <> 2 then
    raise exception 'Mission steps were not persisted';
  end if;
  select count(*) into before_count from public.ops_missions;
  begin
    perform public.create_brain_mission('{"title":"Must roll back"}', '[{"kind":"valid"},{"kind":""}]');
    raise exception 'Invalid step was accepted';
  exception when invalid_parameter_value then null;
  end;
  if (select count(*) from public.ops_missions) <> before_count then
    raise exception 'Failed mission left partial data';
  end if;
  insert into public.brain_tasks(id,title) values ('test-durable-task','Persisted task');
  if not exists (select 1 from public.brain_tasks where id='test-durable-task') then raise exception 'Task write missing'; end if;
end $$;
set local role anon;
do $$
begin
  begin
    perform * from public.brain_tasks;
    raise exception 'Anonymous task access was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.ops_agent_events(title) values ('Unauthorized');
    raise exception 'Anonymous event write was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_brain_mission('{"title":"Unauthorized"}');
    raise exception 'Anonymous mission execution was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
set local role authenticated;
do $$
begin
  begin
    perform * from public.brain_tasks;
    raise exception 'Unverified browser task access was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

