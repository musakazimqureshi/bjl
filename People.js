'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
// Default photos live in /public/team. A photo uploaded in Admin (ٹیم تصاویر) replaces the default.
const PEOPLE = [{ k: 1, name: 'AMAN MALIK', role: 'MEMBER', file: 'aman.jpg' }, { k: 2, name: 'WALEED AFRIDI', role: 'MEMBER', file: 'waleed.jpg' },
  { k: 3, name: 'MUHAMMAD HASNAIN', role: 'MEMBER', file: 'hasnain.jpg' }, { k: 4, name: 'FALAK', role: 'ORGANIZER', file: 'falak.jpg' }];
const img = p => supabase.storage.from('announcements').getPublicUrl(p).data.publicUrl;
export default function People() {
  const { t } = useLang(); const path = usePathname(); const [c, setC] = useState({});
  useEffect(() => { supabase.rpc('public_content').then(({ data }) => data && setC(data)); }, []);
  if ((path || '').startsWith('/admin')) return null;
  return (<section className="org"><h2>{t('orgT')}</h2><div className="ppl">{PEOPLE.map(p => (<div key={p.k} className={'pp' + (p.role === 'ORGANIZER' ? ' org' : '')}>
    <img src={c['person' + p.k + '_path'] ? img(c['person' + p.k + '_path']) : '/team/' + p.file} alt={p.name} loading="lazy" />
    <b>{p.name}</b><div className="role">{p.role}</div></div>))}</div></section>);
}
