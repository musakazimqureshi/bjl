-- BJL Status media and AI transcript capacity
create table if not exists public.bjl_status (
  id uuid primary key default gen_random_uuid(),
  media_path text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text,
  status_date date not null default current_date,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists bjl_status_published_created_idx on public.bjl_status (published, created_at desc);
alter table public.bjl_status enable row level security;
drop policy if exists "Admins manage BJL status" on public.bjl_status;
create policy "Admins manage BJL status" on public.bjl_status
for all to authenticated
using (exists (select 1 from public.admins a where a.id = (select auth.uid())))
with check (exists (select 1 from public.admins a where a.id = (select auth.uid())));
create or replace function public.public_status()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(s order by s.created_at desc), '[]'::json)
  from (select id, media_path, media_type, caption, status_date, created_at from public.bjl_status where published = true order by created_at desc limit 30) s;
$$;
grant execute on function public.public_status() to anon, authenticated;
create or replace function public.log_ai_chat_report(p_visitor_key text, p_messages jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_visitor_key is null or char_length(p_visitor_key) <> 64
     or p_messages is null or jsonb_typeof(p_messages) <> 'array'
     or jsonb_array_length(p_messages) < 1 or jsonb_array_length(p_messages) > 200 then
    raise exception 'Invalid AI chat report';
  end if;
  insert into public.ai_chat_reports(visitor_key, messages) values (p_visitor_key, p_messages);
  delete from public.ai_chat_reports where created_at < now() - interval '90 days';
end;
$$;
