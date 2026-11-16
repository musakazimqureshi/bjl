-- BJL Phase 10: homepage match tiles and ground default
-- Run this once in Supabase SQL Editor after your existing phase7, phase8 and phase9 scripts.
-- No new tables or destructive changes are required. Match team IDs are stored in existing settings.

insert into public.settings (key, value)
values
  ('ground_name', 'Dab Ground, Battagram'),
  ('next_a_id', ''),
  ('next_b_id', '')
on conflict (key) do nothing;

-- Public squad navigation uses the existing public_teams() RPC.
-- It already returns each team's UUID and player squad without mobile numbers.
-- No policy changes are required for this phase.
