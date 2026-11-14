-- Run once in Supabase SQL Editor (new query). Replaces phase3 payment function.
alter table teams alter column payment set default 'pending';
update teams set payment = 'pending' where payment = 'not_due';
alter table payments alter column transaction_id drop not null;

drop function if exists submit_payment(text, text, text);
create or replace function submit_payment(p_ref text, p_path text)
returns void language plpgsql security definer as $$
declare tid uuid;
begin
  select id into tid from teams where tracking_ref = upper(trim(p_ref)) and status <> 'rejected';
  if tid is null then raise exception 'Team not found for this reference'; end if;
  if exists (select 1 from teams where id = tid and payment = 'verified') then
    raise exception 'Payment already verified'; end if;
  if exists (select 1 from payments where team_id = tid and status = 'submitted') then
    raise exception 'Payment already submitted and waiting for admin check'; end if;
  insert into payments(team_id, screenshot_path) values (tid, p_path);
  update teams set payment = 'submitted' where id = tid;
end $$;
grant execute on function submit_payment(text, text) to anon, authenticated;
