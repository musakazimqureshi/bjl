'use client';
import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
export default function Teams() {
  const { t } = useLang();
  const [list, setList] = useState(null);
  useEffect(() => { supabase.rpc('confirmed_teams').then(({ data }) => setList(data || [])); }, []);
  return (<><h2>{t('teams')}</h2>
    {list && list.length === 0 && <p>{t('none')}</p>}
    {(list || []).map(x => (<div className="card" key={x.reg_id}>
      <b>{x.name}</b> <small>({x.reg_id})</small>
      <div>{t('cap')}: {x.captain} · {t('vc')}: {x.vice}</div></div>))}
  </>);
}
