'use client';
import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
const PEOPLE = [{ k: 1, name: 'AMAN MALIK', role: 'MEMBER' }, { k: 2, name: 'WALEED AFRIDI', role: 'MEMBER' },
  { k: 3, name: 'MUHAMMAD HASNAIN', role: 'MEMBER' }, { k: 4, name: 'FALAK', role: 'ORGANIZER' }];
const img = p => supabase.storage.from('announcements').getPublicUrl(p).data.publicUrl;
export default function People() {
  const { t } = useLang(); const [c, setC] = useState({});
  useEffect(() => { supabase.rpc('public_content').then(({ data }) => data && setC(data)); }, []);
  return (<><h2>{t('orgT')}</h2><div className="ppl">{PEOPLE.map(p => (<div key={p.k} className={'pp' + (p.role === 'ORGANIZER' ? ' org' : '')}>
    {c['person' + p.k + '_path'] ? <img src={img(c['person' + p.k + '_path'])} alt="" loading="lazy" /> : <div className="pimg ph">{p.name[0]}</div>}
    <b>{p.name}</b><div className="role">{p.role}</div></div>))}</div></>);
}
