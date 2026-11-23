'use client';
import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
const pub = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
const LBL = { batter: 'Batter', bowler: 'Bowler', all_rounder: 'All-Rounder', wicket_keeper: 'Wicket-Keeper' };
export default function Teams() {
  const { t } = useLang();
  const [list, setList] = useState(null); const [sel, setSel] = useState(null); const [q, setQ] = useState(''); const [objections, setObjections] = useState([]);
  useEffect(() => {
    supabase.rpc('public_teams').then(({ data }) => setList(data || []));
    supabase.rpc('public_objections').then(({ data }) => setObjections(data || []));
  }, []);
  const badge = v => <span className={'badge ' + (v ? 'v' : 'n')}>{v ? '✓ ' + t('verifiedBadge') : t('notVerifiedBadge')}</span>;
  return (<><h2>{t('teams')}</h2>
    <input placeholder={t('search')} value={q} onChange={e => setQ(e.target.value)} />
    {list && list.length === 0 && <p>{t('none')}</p>}
    <div className="two">{(list || []).filter(x => x.name.toLowerCase().includes(q.trim().toLowerCase())).map(x => (
      <div className="card" key={x.id} onClick={() => setSel(x)} style={{ cursor: 'pointer' }}>
        <b>{x.name}</b> <small>{x.reg_id}</small><div>{badge(x.verified)}</div>
        <div className="players">{(x.players || []).slice(0, 2).map((c, i) => (<div key={i} className="pl"><img className="ph sm" src={pub(c.photo)} alt="" /><div>{c.name}</div><small>{t(i === 0 ? 'cap1' : 'cap2')}</small></div>))}</div>
      </div>))}</div>
    <section className="bjl-public-objections">
      <h2>Player Objections & Admin Operations</h2>
      <p>Objections submitted for registered players, including the reason, reporting team, details and current status.</p>
      {objections.filter(o => o.status === 'open').length === 0 ? <div className="card">No active player objections.</div> : objections.filter(o => o.status === 'open').map(o => (
        <article className="card bjl-public-objection" key={o.id}>
          <div className="row" style={{justifyContent:'space-between',alignItems:'center',gap:10}}>
            <b>{o.player_name || 'Player'} · {o.team_name || 'Team'}</b>
            <span className="badge n">ACTIVE OBJECTION</span>
          </div>
          <p><b>Reason:</b> {o.reason}</p>
          <p><b>Reported by:</b> {o.source_team_name || o.raised_by || 'Not provided'}</p>
          <p>{o.details || 'No additional details provided.'}</p>
          <small>{new Date(o.created_at).toLocaleString('en-GB')}</small>
        </article>
      ))}
    </section>
    {sel && <div className="modal" onClick={() => setSel(null)}><div className="mbox" onClick={e => e.stopPropagation()}>
      <button className="btn alt" onClick={() => setSel(null)}>✕</button>
      <h3>{sel.name} <small>{sel.reg_id}</small></h3>{badge(sel.verified)}
      <div className="pgrid">{(sel.players || []).map((p, i) => (<div key={i} className="pl"><img className="ph sm" src={pub(p.photo)} alt="" /><div>{p.name}</div>
        <small>{t(LBL[p.position])} · {p.age}</small>{i < 2 && <small> ★ {t(i === 0 ? 'cap1' : 'cap2')}</small>}</div>))}</div></div></div>}
  </>);
}
