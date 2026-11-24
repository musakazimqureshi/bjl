'use client';
import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
const pub = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
const LBL = { batter: 'Batter', bowler: 'Bowler', all_rounder: 'All-Rounder', wicket_keeper: 'Wicket-Keeper' };
export default function Teams() {
  const { t } = useLang();
  const [list, setList] = useState(null); const [sel, setSel] = useState(null); const [serial, setSerial] = useState(0); const [q, setQ] = useState(''); const [objections, setObjections] = useState([]); const [shareNotice, setShareNotice] = useState('');
  const openTeam = x => { const idx = (list || []).findIndex(item => item.id === x.id); setSerial(idx >= 0 ? idx + 1 : 0); setSel(x); setShareNotice(''); };
  const shareTeam = async () => {
    if (!sel) return;
    const url = window.location.origin + '/teams';
    const message = 'BJL Season 1 Team Profile\\nTeam: ' + sel.name + '\\nRegistration ID: ' + (sel.reg_id || 'N/A') + '\\nView registered teams: ' + url;
    try {
      if (navigator.share) await navigator.share({ title: 'BJL Season 1 · ' + sel.name, text: message, url });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(message); setShareNotice('Team profile details copied. Paste them into WhatsApp.'); }
      else setShareNotice(message);
    } catch (e) { if (e?.name !== 'AbortError') setShareNotice('Sharing is unavailable. Use Save / Print PDF.'); }
  };
  useEffect(() => {
    supabase.rpc('public_teams').then(({ data }) => setList(data || []));
    supabase.rpc('public_objections').then(({ data }) => setObjections(data || []));
  }, []);
  const badge = v => <span className={'badge ' + (v ? 'v' : 'n')}>{v ? '✓ ' + t('verifiedBadge') : t('notVerifiedBadge')}</span>;
  return (<><h2>{t('teams')}</h2>
    <input placeholder={t('search')} value={q} onChange={e => setQ(e.target.value)} />
    {list && list.length === 0 && <p>{t('none')}</p>}
    <div className="two">{(list || []).filter(x => x.name.toLowerCase().includes(q.trim().toLowerCase())).map(x => (
      <div className="card" key={x.id} onClick={() => openTeam(x)} style={{ cursor: 'pointer' }}>
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
    {sel && <div className="modal bjl-team-modal" onClick={() => setSel(null)}><div className="mbox bjl-team-modal-box" onClick={e => e.stopPropagation()}>
      <div className="bjl-team-actions">
        <button className="btn alt" type="button" onClick={() => setSel(null)}>✕ Close</button>
        <button className="btn alt" type="button" onClick={shareTeam}>↗ Share Team</button>
        <button className="btn" type="button" onClick={() => window.print()}>▣ Save / Print PDF</button>
      </div>
      {shareNotice && <p className="bjl-team-share-notice" role="status">{shareNotice}</p>}
      <article className="bjl-team-poster" id="bjl-team-poster">
        <header className="bjl-team-poster-head"><div className="bjl-team-brand-mark">BJL</div><div className="bjl-team-season">BATTAGRAM JUNIOR LEAGUE <span>SEASON 1 · TAPE BALL CRICKET</span></div><div className="bjl-team-serial">TEAM #\${String(serial || 0).padStart(2,'0')}</div></header>
        <div className="bjl-team-title-row"><div><small>OFFICIAL TEAM PROFILE</small><h2>{sel.name}</h2></div><div className="bjl-team-reg"><small>REGISTRATION ID</small><b>{sel.reg_id || '—'}</b></div></div>
        <div className="bjl-team-season-line">BJL SEASON 1 <span>·</span> OFFICIAL SQUAD</div>
        <div className="bjl-team-squad">{(sel.players || []).slice(0,15).map((p,i) => (<div className="bjl-team-player" key={p.id || i}><div className="bjl-team-player-photo">{p.photo ? <img src={pub(p.photo)} alt={p.name || 'Player'} /> : <span>PLAYER</span>}<i>{String(i+1).padStart(2,'0')}</i></div><b>{p.name}</b><small>{LBL[p.position] || p.position || 'Player'} · {p.age || '—'} yrs</small>{i < 2 && <em>{i === 0 ? 'CAPTAIN' : 'VICE CAPTAIN'}</em>}</div>))}</div>
        <footer className="bjl-team-poster-footer"><span>BJL OFFICIAL WEBSITE</span><b>BATTAGRAM JUNIOR LEAGUE</b><small>battagramjuniorleague.com</small></footer>
      </article>
    </div></div>}
  </>);
}
