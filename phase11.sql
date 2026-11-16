-- BJL phase 11: quotes -> remove quote number 8 (brother, Saying 289), keep Letter 31, total 9. Run ONCE after phase 10.
delete from quotes where ref like 'کلماتِ قصار، حکمت نمبر 289%';

insert into quotes (body, book, ref, sort_order)
select $q$جوان کا دل خالی زمین کی مانند ہے؛ اس میں جو کچھ بویا جائے اسے قبول کر لیتا ہے۔$q$, 'نہج البلاغہ (سید رضیؒ)', 'مکتوب نمبر 31 (امام حسنؑ کے نام وصیت)', 8
where not exists (select 1 from quotes where ref like 'مکتوب نمبر 31%');

update quotes set sort_order = v.n
from (values
  ('کلماتِ قصار، حکمت نمبر 11', 1), ('کلماتِ قصار، حکمت نمبر 23', 2), ('کلماتِ قصار، حکمت نمبر 54', 3),
  ('کلماتِ قصار، حکمت نمبر 73', 4), ('کلماتِ قصار، حکمت نمبر 113 (ایک حصہ)', 5), ('کلماتِ قصار، حکمت نمبر 24', 6),
  ('کلماتِ قصار، حکمت نمبر 12', 7), ('مکتوب نمبر 31 (امام حسنؑ کے نام وصیت)', 8), ('کلماتِ قصار، حکمت نمبر 10', 9)
) as v(ref, n) where quotes.ref = v.ref;
