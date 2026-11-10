-- Run once in Supabase SQL Editor (new query)
create or replace function public_stats() returns json language sql security definer as $$
  select json_build_object(
    'confirmed',(select count(*) from teams where payment='verified'),
    'open',(select value='true' from settings where key='registration_open')); $$;

create or replace function confirmed_teams()
returns table(reg_id text, name text, captain text, vice text)
language sql security definer as $$
  select t.reg_id, t.name, c.name, v.name from teams t
  left join players c on c.id=t.captain_id left join players v on v.id=t.vice_captain_id
  where t.payment='verified' order by t.confirmed_at; $$;

grant execute on function public_stats(), confirmed_teams(), submit_team(jsonb,jsonb) to anon, authenticated;

create policy "upload player photos" on storage.objects for insert to anon, authenticated
  with check (bucket_id='player-photos');
create policy "upload payments" on storage.objects for insert to anon, authenticated
  with check (bucket_id='payments');
create policy "read announcements" on storage.objects for select using (bucket_id='announcements');
create policy "admin storage" on storage.objects for all to authenticated
  using (exists (select 1 from admins a where a.id=auth.uid()));
