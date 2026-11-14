-- Run once in Supabase SQL Editor (new query). Mobile numbers only for Captain and Vice-Captain.
alter table players alter column mobile drop not null;

create or replace function submit_team(t jsonb, p jsonb)
returns text language plpgsql security definer as $$
declare tid uuid; pid uuid[] := '{}'; r jsonb; ref text; v_id uuid; i int := 0; ci int; vi int; mob text;
begin
  if (select value from settings where key='registration_open') <> 'true' then
    raise exception 'REGISTRATION CLOSED'; end if;
  if jsonb_array_length(p) <> 15 then raise exception 'Exactly 15 players required'; end if;
  ci := (t->>'captain_index')::int; vi := (t->>'vice_index')::int;
  if ci = vi then raise exception 'Captain and Vice-Captain must differ'; end if;
  if ci < 0 or ci > 14 or vi < 0 or vi > 14 then raise exception 'Invalid captain selection'; end if;
  insert into teams(name, manager_name, manager_mobile)
    values (t->>'name', t->>'manager_name', t->>'manager_mobile')
    returning id, tracking_ref into tid, ref;
  for r in select * from jsonb_array_elements(p) loop
    mob := nullif(trim(r->>'mobile'), '');
    if (i = ci or i = vi) and mob is null then
      raise exception 'Captain and Vice-Captain mobile numbers are required'; end if;
    insert into players(team_id, name, mobile, age, position, photo_path)
    values (tid, r->>'name', mob, (r->>'age')::int, (r->>'position')::player_pos, r->>'photo_path')
    returning id into v_id;
    pid := pid || v_id; i := i + 1;
  end loop;
  update teams set captain_id = pid[ci + 1], vice_captain_id = pid[vi + 1] where id = tid;
  return ref;
end $$;
grant execute on function submit_team(jsonb, jsonb) to anon, authenticated;
