'use client';
import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
const pub = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
const LBL = { batter: 'Batter', bowler: 'Bowler', all_rounder: 'All-Rounder', wicket_keeper: 'Wicket-Keeper' };
export default function Teams() {
  const { t } = useLang();
  const [list, setList] = useState(null); const [sel, setSel] = useState(null);
  useEffect(() => { supabase.rpc('public_teams').then(({ data }) => { const rows = data || []; setList(rows); const id = new URLSearchParams(window.location.search).get('team'); if (id) setSel(rows.find(x => String(x.id) === id) || null); }); }, []);
  const badge = v => <span className={'badge ' + (v ? 'v' : 'n')}>{v ? '✓ ' + t('verifiedBadge') : t('notVerifiedBadge')}</span>;
  return (<><h2>{t('teams')}</h2>
    {list && list.length === 0 && <p>{t('none')}</p>}
    <div className="two">{(list || []).map(x => (
      <div className="card" key={x.id} onClick={() => setSel(x)} style={{ cursor: 'pointer' }}>
        <b>{x.name}</b> <small>{x.reg_id}</small><div>{badge(x.verified)}</div>
        <div className="players">{(x.players || []).slice(0, 2).map((c, i) => (<div key={i} className="pl"><img className="ph sm" src={pub(c.photo)} alt="" /><div>{c.name}</div><small>{t(i === 0 ? 'cap1' : 'cap2')}</small></div>))}</div>
      </div>))}</div>
    {sel && <div className="modal" onClick={() => setSel(null)}><div className="mbox" onClick={e => e.stopPropagation()}>
      <button className="btn alt" onClick={() => setSel(null)}>✕</button>
      <h3>{sel.name} <small>{sel.reg_id}</small></h3>{badge(sel.verified)}
      <div className="pgrid">{(sel.players || []).map((p, i) => (<div key={i} className="pl"><img className="ph sm" src={pub(p.photo)} alt="" /><div>{p.name}</div>
        <small>{t(LBL[p.position])} · {p.age}</small>{i < 2 && <small> ★ {t(i === 0 ? 'cap1' : 'cap2')}</small>}</div>))}</div></div></div>}
  </>);
}
