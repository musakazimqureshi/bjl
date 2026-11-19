create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_current_admin_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) = '7899b787-8ef6-4a46-a296-79ba80dfe84b'::uuid
    and exists (select 1 from public.admins a where a.id = (select auth.uid()))
    and exists (
      select 1 from auth.sessions s
      where s.user_id = (select auth.uid())
        and s.id = ((select auth.jwt()) ->> 'session_id')::uuid
    );
$$;

revoke all on function private.is_current_admin_session() from public, anon;
grant execute on function private.is_current_admin_session() to authenticated;

drop policy if exists admin_self_read on public.admins;
create policy admin_self_read on public.admins for select to authenticated
  using (private.is_current_admin_session());

drop policy if exists admin_all on public.announcements;
create policy admin_all on public.announcements for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
drop policy if exists admin_all on public.audit_logs;
create policy admin_all on public.audit_logs for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
drop policy if exists admin_all on public.matches;
create policy admin_all on public.matches for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
drop policy if exists admin_all on public.moments;
create policy admin_all on public.moments for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
drop policy if exists admin_all on public.payments;
create policy admin_all on public.payments for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
drop policy if exists admin_all on public.player_objections;
create policy admin_all on public.player_objections for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
drop policy if exists admin_all on public.players;
create policy admin_all on public.players for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
drop policy if exists admin_all on public.quotes;
create policy admin_all on public.quotes for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
drop policy if exists admin_all on public.settings;
create policy admin_all on public.settings for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
drop policy if exists admin_all on public.teams;
create policy admin_all on public.teams for all to authenticated
  using (private.is_current_admin_session()) with check (private.is_current_admin_session());
