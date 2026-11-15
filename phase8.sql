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
