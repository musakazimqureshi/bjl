'use client';
import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
const pub = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
const LBL = { batter: 'Batter', bowler: 'Bowler', all_rounder: 'All-Rounder', wicket_keeper: 'Wicket-Keeper' };
export default function Teams() {
  const { t } = useLang();
  const [list, setList] = useState(null); const [sel, setSel] = useState(null); const [q, setQ] = useState('');
  useEffect(() => { supabase.rpc('public_teams').then(({ data }) => setList(data || [])); }, []);
  const [objections, setObjections] = useState([]);
  useEffect(() => { supabase.rpc('public_objections').then(({ data, error }) => { if (!error) setObjections(data || []); }); }, []);
  const statusLabel = s => ({ open: 'Open', under_review: 'Under Review' }[String(s || '').toLowerCase()] || 'Open');
  const teamObjections = id => objections.filter(o => o.team_id === id && ['open', 'under_review'].includes(String(o.status || 'open').toLowerCase()));
  const badge = v => <span className={'badge ' + (v ? 'v' : 'n')}>{v ? '✓ ' + t('verifiedBadge') : t('notVerifiedBadge')}</span>;
  return (<><h2>{t('teams')}</h2>
    <input placeholder={t('search')} value={q} onChange={e => setQ(e.target.value)} />
    {list && list.length === 0 && <p>{t('none')}</p>}
    <div className="two">{(list || []).filter(x => x.name.toLowerCase().includes(q.trim().toLowerCase())).map(x => (
      <div className="card" key={x.id} onClick={() => setSel(x)} style={{ cursor: 'pointer' }}>
        <b>{x.name}</b> <small>{x.reg_id}</small><div>{badge(x.verified)}</div>
        <div className="players">{(x.players || []).slice(0, 2).map((c, i) => (<div key={i} className="pl"><img className="ph sm" src={pub(c.photo)} alt="" /><div>{c.name}</div><small>{t(i === 0 ? 'cap1' : 'cap2')}</small></div>))}</div>
      </div>))}</div>
    {sel && <div className="modal" onClick={() => setSel(null)}><div className="mbox" onClick={e => e.stopPropagation()}>
      <button className="btn alt" onClick={() => setSel(null)}>✕</button>
      <h3>{sel.name} <small>{sel.reg_id}</small></h3>{badge(sel.verified)}
      {teamObjections(sel.id).length > 0 && <section className="objections-public">
        <h4>⚠ Player Objections ({teamObjections(sel.id).length})</h4>
        {teamObjections(sel.id).map(o => <article className="objection-public" key={o.id}>
          <div className="objection-public-head"><strong>{o.player_name}</strong><span className={'objection-status ' + String(o.status || 'open').toLowerCase().replaceAll('_','-')}>{statusLabel(o.status)}</span></div>
          <p><b>Objection Reason:</b> {o.reason || 'Not specified'}</p>
          <p><b>Complaint By:</b> {o.raised_by || 'Not specified'}</p>
          {o.details && <p><b>Details:</b> {o.details}</p>}
          <small>Reported: {o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB', {day:'2-digit',month:'2-digit',year:'numeric'}) : ''}</small>
        </article>)}
      </section>}
      <div className="pgrid">{(sel.players || []).map((p, i) => (<div key={i} className="pl"><img className="ph sm" src={pub(p.photo)} alt="" /><div>{p.name}</div>
        <small>{t(LBL[p.position])} · {p.age}</small>{i < 2 && <small> ★ {t(i === 0 ? 'cap1' : 'cap2')}</small>}</div>))}</div></div></div>}
  </>);
}
