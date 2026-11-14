-- BJL phase 7 (includes phase 6). Run ONCE in Supabase SQL Editor as a new query.
-- admin check fix
drop policy if exists admin_all on admins;
drop policy if exists admin_self_read on admins;
create policy admin_self_read on admins for select using (id = auth.uid());

-- player photos are shown on the public team pages
update storage.buckets set public = true where id = 'player-photos';

-- new team structure: no manager, two captains with mobile, 13 players without mobile
alter table teams alter column manager_name drop not null;
alter table teams alter column manager_mobile drop not null;
alter table players alter column mobile drop not null;
alter table players add column if not exists seq int default 0;
alter table payments alter column transaction_id drop not null;

-- no 30-team limit: verification only stamps the date
create or replace function guard_confirmation() returns trigger language plpgsql as $$
begin
  if new.payment = 'verified' and old.payment is distinct from 'verified' then new.confirmed_at := now(); end if;
  if new.payment <> 'verified' then new.confirmed_at := null; end if;
  return new;
end $$;

create or replace function public_content() returns json language sql security definer as $$
  select coalesce(json_object_agg(key, value), '{}'::json) from settings; $$;

create or replace function public_announcements() returns json language sql security definer as $$
  select coalesce(json_agg(a order by a.announce_date desc, a.announce_time desc nulls last, a.created_at desc), '[]'::json)
  from (select id, title, description, image_path, announce_date, announce_time, created_at from announcements where published) a; $$;

create or replace function public_stats() returns json language sql security definer as $$
  select json_build_object('total', (select count(*) from teams),
    'verified', (select count(*) from teams where payment = 'verified'),
    'not_verified', (select count(*) from teams where payment <> 'verified'),
    'open', (select value = 'true' from settings where key = 'registration_open')); $$;

-- public team list: no mobile numbers
create or replace function public_teams() returns json language sql security definer as $$
  select coalesce(json_agg(x order by x.created_at), '[]'::json) from (
    select t.id, t.reg_id, t.name, t.created_at, (t.payment = 'verified') as verified,
      (select json_agg(json_build_object('name', p.name, 'age', p.age, 'position', p.position, 'photo', p.photo_path) order by p.seq)
         from players p where p.team_id = t.id) as players
    from teams t) x; $$;

create or replace function submit_team(t jsonb, p jsonb) returns text language plpgsql security definer as $$
declare tid uuid; pid uuid[] := '{}'; r jsonb; v_id uuid; i int := 0; mob text; rid text;
begin
  if (select value from settings where key = 'registration_open') <> 'true' then raise exception 'REGISTRATION CLOSED'; end if;
  if coalesce(trim(t->>'name'), '') = '' then raise exception 'Team name required'; end if;
  if jsonb_array_length(p) <> 15 then raise exception 'Exactly 15 players required'; end if;
  rid := 'BJL-' || lpad(nextval('team_reg_seq')::text, 3, '0');
  insert into teams(name, reg_id) values (trim(t->>'name'), rid) returning id into tid;
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

drop function if exists submit_payment(text, text);
drop function if exists submit_payment(text, text, text);
create or replace function submit_payment(p_ref text, p_path text, p_txn text default null)
returns void language plpgsql security definer as $$
declare tid uuid; txn text := nullif(trim(coalesce(p_txn, '')), '');
begin
  select id into tid from teams where reg_id = upper(trim(p_ref)) or tracking_ref = upper(trim(p_ref));
  if tid is null then raise exception 'Team not found for this Registration ID'; end if;
  if exists (select 1 from teams where id = tid and payment = 'verified') then raise exception 'Payment already verified'; end if;
  if exists (select 1 from payments where team_id = tid and status = 'submitted') then
    raise exception 'Payment already submitted and waiting for admin check'; end if;
  if txn is not null and exists (select 1 from payments where transaction_id = txn) then
    raise exception 'This Transaction ID was already used'; end if;
  insert into payments(team_id, screenshot_path, transaction_id) values (tid, p_path, txn);
  update teams set payment = 'submitted' where id = tid;
end $$;

grant execute on function public_content(), public_announcements(), public_stats(), public_teams(),
  submit_team(jsonb, jsonb), submit_payment(text, text, text) to anon, authenticated;
