-- Private BJL administrator profile. Only a row belonging to an authenticated
-- member of public.admins can be read or changed through the Data API.
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Musa Kazim Qureshi',
  role text not null default 'Founder & Organizer · Battagram Junior League',
  bio text not null default '',
  photo_path text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;
grant select, insert, update on public.admin_profiles to authenticated;

drop policy if exists admin_profiles_select_self on public.admin_profiles;
create policy admin_profiles_select_self on public.admin_profiles
  for select to authenticated
  using (id = (select auth.uid()) and exists (
    select 1 from public.admins a where a.id = (select auth.uid())
  ));

drop policy if exists admin_profiles_insert_self on public.admin_profiles;
create policy admin_profiles_insert_self on public.admin_profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and exists (
    select 1 from public.admins a where a.id = (select auth.uid())
  ));

drop policy if exists admin_profiles_update_self on public.admin_profiles;
create policy admin_profiles_update_self on public.admin_profiles
  for update to authenticated
  using (id = (select auth.uid()) and exists (
    select 1 from public.admins a where a.id = (select auth.uid())
  ))
  with check (id = (select auth.uid()) and exists (
    select 1 from public.admins a where a.id = (select auth.uid())
  ));
