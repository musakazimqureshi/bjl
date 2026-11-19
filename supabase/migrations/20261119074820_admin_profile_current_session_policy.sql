-- Restrict profile access to the same verified, active admin session used by
-- the existing BJL admin workspace policies.
drop policy if exists admin_profiles_select_self on public.admin_profiles;
create policy admin_profiles_select_self on public.admin_profiles
  for select to authenticated
  using (id = (select auth.uid()) and (select private.is_current_admin_session()));

drop policy if exists admin_profiles_insert_self on public.admin_profiles;
create policy admin_profiles_insert_self on public.admin_profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and (select private.is_current_admin_session()));

drop policy if exists admin_profiles_update_self on public.admin_profiles;
create policy admin_profiles_update_self on public.admin_profiles
  for update to authenticated
  using (id = (select auth.uid()) and (select private.is_current_admin_session()))
  with check (id = (select auth.uid()) and (select private.is_current_admin_session()));
