-- BJL: run this WHOLE file once in Supabase SQL Editor (new query). It contains phases 7 to 11 in the right order.
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
-- BJL phase 8. Run ONCE as a new query in Supabase SQL Editor (after phase7).
alter table announcements add column if not exists sort_order int default 0;

create table if not exists moments (
  id uuid primary key default gen_random_uuid(),
  image_path text not null, caption text,
  moment_date date not null default current_date,
  published boolean not null default true,
  created_at timestamptz default now());
alter table moments enable row level security;
drop policy if exists admin_all on moments;
create policy admin_all on moments for all using (exists (select 1 from admins a where a.id = auth.uid()));

create or replace function public_announcements() returns json language sql security definer as $$
  select coalesce(json_agg(a order by a.sort_order, a.announce_date desc, a.created_at desc), '[]'::json)
  from (select id, title, description, image_path, announce_date, announce_time, created_at, coalesce(sort_order, 0) as sort_order
        from announcements where published) a; $$;

create or replace function public_moments() returns json language sql security definer as $$
  select coalesce(json_agg(m order by m.moment_date desc, m.created_at desc), '[]'::json)
  from (select id, image_path, caption, moment_date, created_at from moments where published) m; $$;

grant execute on function public_announcements(), public_moments() to anon, authenticated;
-- BJL phase 9: Ahl-e-Bait quotes + security hardening. Run ONCE after phase7 and phase8.
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  body text not null, book text not null, ref text not null,
  sort_order int not null default 0, published boolean not null default true,
  created_at timestamptz default now());
alter table quotes enable row level security;
drop policy if exists admin_all on quotes;
create policy admin_all on quotes for all using (exists (select 1 from admins a where a.id = auth.uid()));

create or replace function public_quotes() returns json language sql security definer set search_path = public as $$
  select coalesce(json_agg(q order by q.sort_order, q.created_at), '[]'::json)
  from (select id, body, book, ref, sort_order, created_at from quotes where published) q; $$;
grant execute on function public_quotes() to anon, authenticated;

-- safe search_path for every SECURITY DEFINER function
alter function public_stats() set search_path = public;
alter function public_teams() set search_path = public;
alter function public_content() set search_path = public;
alter function public_announcements() set search_path = public;
alter function public_moments() set search_path = public;
alter function submit_team(jsonb, jsonb) set search_path = public;
alter function submit_payment(text, text, text) set search_path = public;

-- ten quotations (Urdu translation; sources checked against balagha.app, al-islam.org / Mizan al-Hikmah, thaqalayn.net)
insert into quotes (body, book, ref, sort_order)
select * from (values
 ($q$جب تم اپنے دشمن پر قابو پا لو تو اس قدرت کے شکرانے کے طور پر اسے معاف کر دو۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'کلماتِ قصار، حکمت نمبر 11', 1),
 ($q$جسے اس کا عمل پیچھے رکھے، اسے اس کا نسب آگے نہیں بڑھا سکتا۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'کلماتِ قصار، حکمت نمبر 23', 2),
 ($q$عقل جیسی کوئی دولت نہیں، جہالت جیسی کوئی غربت نہیں، ادب جیسی کوئی میراث نہیں اور مشورے جیسا کوئی مددگار نہیں۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'کلماتِ قصار، حکمت نمبر 54', 3),
 ($q$جو شخص خود کو لوگوں کا پیشوا بنائے، اسے چاہیے کہ دوسروں کو سکھانے سے پہلے خود کو سکھائے، اور زبان سے تربیت کرنے سے پہلے اپنے کردار سے تربیت کرے۔ جو اپنے نفس کو سکھاتا اور سنوارتا ہے وہ دوسروں کو سکھانے اور سنوارنے والے سے زیادہ احترام کا حق دار ہے۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'کلماتِ قصار، حکمت نمبر 73', 4),
 ($q$حسنِ اخلاق جیسا کوئی ساتھی نہیں اور ادب جیسی کوئی میراث نہیں۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'کلماتِ قصار، حکمت نمبر 113 (ایک حصہ)', 5),
 ($q$پریشان حال کی فریاد رسی کرنا اور مصیبت زدہ کی مشکل آسان کرنا بڑے گناہوں کے کفاروں میں سے ہے۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'کلماتِ قصار، حکمت نمبر 24', 6),
 ($q$سب سے زیادہ عاجز وہ ہے جو چند بھائی (دوست) بنانے سے عاجز رہے، اور اس سے بھی زیادہ عاجز وہ ہے جو بنے ہوئے دوست کو کھو دے۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'کلماتِ قصار، حکمت نمبر 12', 7),
 ($q$میرا ایک اللہ کی خاطر بھائی تھا؛ وہ جو کہتا تھا وہی کرتا تھا اور جو کرتا نہیں تھا وہ کہتا نہیں تھا۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'کلماتِ قصار، حکمت نمبر 289 (ایک حصہ)', 8),
 ($q$جوان کا دل خالی زمین کی مانند ہے؛ اس میں جو کچھ بویا جائے اسے قبول کر لیتا ہے۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'مکتوب نمبر 31 (امام حسنؑ کے نام وصیت)', 9),
 ($q$لوگوں سے اس طرح میل جول رکھو کہ اگر تم مر جاؤ تو وہ تم پر روئیں اور اگر زندہ رہو تو تمہارے مشتاق رہیں۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'کلماتِ قصار، حکمت نمبر 10', 10)
) as v(body, book, ref, sort_order)
where not exists (select 1 from quotes);
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
-- BJL phase 11: quotes -> remove quote number 8 (brother, Saying 289), keep Letter 31, total 9. Run ONCE after phase 10.
delete from quotes where ref like 'کلماتِ قصار، حکمت نمبر 289%';

insert into quotes (body, book, ref, sort_order)
select $q$جوان کا دل خالی زمین کی مانند ہے؛ اس میں جو کچھ بویا جائے اسے قبول کر لیتا ہے۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'مکتوب نمبر 31 (امام حسنؑ کے نام وصیت)', 8
where not exists (select 1 from quotes where ref like 'مکتوب نمبر 31%');

update quotes set sort_order = v.n
from (values
  ('کلماتِ قصار، حکمت نمبر 11', 1), ('کلماتِ قصار، حکمت نمبر 23', 2), ('کلماتِ قصار، حکمت نمبر 54', 3),
  ('کلماتِ قصار، حکمت نمبر 73', 4), ('کلماتِ قصار، حکمت نمبر 113 (ایک حصہ)', 5), ('کلماتِ قصار، حکمت نمبر 24', 6),
  ('کلماتِ قصار، حکمت نمبر 12', 7), ('مکتوب نمبر 31 (امام حسنؑ کے نام وصیت)', 8), ('کلماتِ قصار، حکمت نمبر 10', 9)
) as v(ref, n) where quotes.ref = v.ref;
