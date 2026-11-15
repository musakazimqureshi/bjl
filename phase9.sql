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
