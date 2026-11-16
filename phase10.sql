-- BJL phase 10: captain login data, 9 quotes. Run ONCE after phase 7, 8, 9.
alter table teams add column if not exists captain_email text;

-- captains (signed-in users) can read ONLY their own team
drop policy if exists owner_read on teams;
create policy owner_read on teams for select to authenticated
  using (lower(captain_email) = lower(auth.jwt() ->> 'email'));
drop policy if exists owner_read on players;
create policy owner_read on players for select to authenticated
  using (exists (select 1 from teams t where t.id = players.team_id and lower(t.captain_email) = lower(auth.jwt() ->> 'email')));
drop policy if exists owner_read on payments;
create policy owner_read on payments for select to authenticated
  using (exists (select 1 from teams t where t.id = payments.team_id and lower(t.captain_email) = lower(auth.jwt() ->> 'email')));

-- registration now also stores Captain 1 Gmail (never shown publicly)
create or replace function submit_team(t jsonb, p jsonb) returns text language plpgsql security definer set search_path = public as $$
declare tid uuid; pid uuid[] := '{}'; r jsonb; v_id uuid; i int := 0; mob text; rid text;
        em text := lower(trim(coalesce(t->>'email', '')));
begin
  if (select value from settings where key = 'registration_open') <> 'true' then raise exception 'REGISTRATION CLOSED'; end if;
  if coalesce(trim(t->>'name'), '') = '' then raise exception 'Team name required'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'A valid email is required'; end if;
  if jsonb_array_length(p) <> 15 then raise exception 'Exactly 15 players required'; end if;
  rid := 'BJL-' || lpad(nextval('team_reg_seq')::text, 3, '0');
  insert into teams(name, reg_id, captain_email) values (trim(t->>'name'), rid, em) returning id into tid;
  for r in select * from jsonb_array_elements(p) loop
    mob := nullif(trim(r->>'mobile'), '');
    if i < 2 and mob is null then raise exception 'Captain mobile numbers are required'; end if;
    if i >= 2 then mob := null; end if;
    insert into players(team_id, name, mobile, age, position, photo_path, seq)
      values (tid, trim(r->>'name'), mob, (r->>'age')::int, (r->>'position')::player_pos, r->>'photo_path', i)
      returning id into v_id;
    pid := pid || v_id; i := i + 1;
  end loop;
  update teams set captain_id = pid[1], vice_captain_id = pid[2] where id = tid;
  return rid;
end $$;
grant execute on function submit_team(jsonb, jsonb) to anon, authenticated;

-- remove quote number 9 (Letter 31) so 9 quotes remain
delete from quotes where ref like 'مکتوب نمبر 31%';
update quotes set sort_order = 9 where ref = 'کلماتِ قصار، حکمت نمبر 10';
