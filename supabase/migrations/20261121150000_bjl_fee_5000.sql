-- Set the current BJL entry fee to PKR 5,000 for all new payment rows.
-- Preserve historical payment rows recorded at PKR 4,000.
alter table public.payments alter column amount set default 5000;
alter table public.payments drop constraint if exists payments_amount_check;
alter table public.payments
  add constraint payments_amount_check check (amount in (4000, 5000));
