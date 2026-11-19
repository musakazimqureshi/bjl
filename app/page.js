'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { CONTACTS } from '../lib/config';
import People from '../components/People';
const fmt = tm => { if (!tm) return ''; const [h, m] = tm.split(':'); const hh = +h; return `${((hh + 11) % 12) + 1}:${m} ${hh >= 12 ? 'PM' : 'AM'}`; };
const img = p => supabase.storage.from('announcements').getPublicUrl(p).data.publicUrl;
const pubP = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
const LBL = { batter: 'Batter', bowler: 'Bowler', all_rounder: 'All-Rounder', wicket_keeper: 'Wicket-Keeper' };
export default function Home() {
  const { t } = useLang();
  const [s, setS] = useState({ total: 0, verified: 0, not_verified: 0 });
  const [c, setC] = useState({}); const [ann, setAnn] = useState([]); const [moms, setMoms] = useState([]);
  const [lb, setLb] = useState(null); const [gi, setGi] = useState(null); const [allAnn, setAllAnn] = useState(false);
  const [qs, setQs] = useState([]); const [qi, setQi] = useState(0); const [hold, setHold] = useState(false);
  const [mi, setMi] = useState(0); const [mh, setMh] = useState(false);
  const [tms, setTms] = useState([]); const [tmSel, setTmSel] = useState(null); const [now, setNow] = useState(Date.now());
  useEffect(() => {
    supabase.rpc('public_stats').then(({ data }) => data && setS(data));
    supabase.rpc('public_content').then(({ data }) => data && setC(data));
    supabase.rpc('public_announcements').then(({ data }) => data && setAnn(data));
    supabase.rpc('public_moments').then(({ data }) => data && setMoms(data));
    supabase.rpc('public_quotes').then(({ data }) => data && setQs(data));
    supabase.rpc('public_teams').then(({ data }) => data && setTms(data));
  }, []);
  useEffect(() => { if (qs.length < 2 || hold) return; const id = setInterval(() => setQi(i => (i + 1) % qs.length), 9000); return () => clearInterval(id); }, [qs.length, hold]);
  useEffect(() => { if (moms.length < 2 || mh) return; const id = setInterval(() => setMi(i => (i + 1) % moms.length), 4500); return () => clearInterval(id); }, [moms.length, mh]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(id); }, []);
  const nm = n => { const f = tms.find(x => x.name.trim().toLowerCase() === (n || '').trim().toLowerCase()); return f ? <button className="tlink" onClick={() => setTmSel(f)}>{n}</button> : n; };
  const target = c.next_date && c.next_time ? new Date(c.next_date + 'T' + c.next_time).getTime() : 0; const diff = target - now;
  const cd = target && diff > 0 ? `${Math.floor(diff / 864e5)}d ${Math.floor((diff % 864e5) / 36e5)}h ${Math.floor((diff % 36e5) / 6e4)}m` : '';
  const pauseQ = () => { setHold(true); clearTimeout(window.__qh); window.__qh = setTimeout(() => setHold(false), 15000); };
  const pauseM = () => { setMh(true); clearTimeout(window.__mh); window.__mh = setTimeout(() => setMh(false), 15000); };
  const stepQ = d => { pauseQ(); setQi(i => (i + d + qs.length) % qs.length); };
  const stepM = d => { pauseM(); setMi(i => (i + d + moms.length) % moms.length); };
  const step = d => setGi(i => (i + d + moms.length) % moms.length);
  const cm = moms[Math.min(mi, moms.length - 1)]; const la = ann[0];
  const showWin = c.winner_show !== '0' && c.winner_team; const showNext = c.next_show !== '0' && c.next_a && c.next_b;
  return (<>
    <section className="hero">
      <div className="shield" style={{ display: 'inline-block', fontSize: '2rem' }}>BJL</div>
      <h1>{t('title')}</h1>
      <div className="calli">{c.calli_path ? <img src={img(c.calli_path)} alt="" /> :
        <div className="ar" lang="ar" dir="rtl">لَا فَتَىٰ إِلَّا عَلِيٌّ وَلَا سَيْفَ إِلَّا ذُو الْفَقَارِ</div>}</div>
      <p>{t('season')}</p><p>{t('loc')}</p>
      <div className="row">
        <Link href="/register" className="btn">{t('regBtn')}</Link>
        <Link href="/teams" className="btn alt">{t('viewBtn')}</Link>
        <Link href="/team" className="btn alt">🔑 {t('captainSignIn')}</Link>
      </div>
    </section>
    <div className="duo">
      <div className="card mc"><h3>{t('todayWinner')}</h3>
        {showWin ? (<><div className="team">🏆 {nm(c.winner_team)}</div>
          {c.loser_team && <div className="lose"><span className="dl">{t('defeated')}</span> {nm(c.loser_team)}</div>}
          {c.winner_result && <div className="res">{c.winner_result}</div>}
          {c.winner_date && <div className="dt">📅 {c.winner_date}</div>}</>) : <div className="empty">{t('noWinner')}</div>}</div>
      <div className="card mc"><h3>{t('nextMatch')}</h3>
        {showNext ? (<><div className="team">{nm(c.next_a)}</div><div className="vsx">{t('vs')}</div><div className="team">{nm(c.next_b)}</div>
          <div className="dt">📅 {c.next_date} {c.next_time && '· ' + fmt(c.next_time)}</div>
          <div className="dt">📍 {c.next_venue || 'Dab Ground, Battagram'}</div>
          {cd && <div className="dt">⏳ {t('startsIn')}: {cd}</div>}</>) : <div className="empty">{t('noNext')}</div>}</div>
    </div>
    <div className="duo">
      <div className="card"><h3>{t('annTitle')}</h3>
        {!la ? <div className="empty">{t('noAnnCard')}</div> : (<>
          <img className="sqimg" src={img(la.image_path)} alt={la.title} loading="lazy" onClick={() => setLb(la)} />
          <div className="annt">{la.title}</div><small>{la.announce_date}</small>
          {ann.length > 1 && <button className="tlink" style={{ marginTop: 6, textAlign: 'start' }} onClick={() => setAllAnn(true)}>{t('allAnn')} ({ann.length})</button>}</>)}</div>
      <div className="card"><h3>{t('momentsT')}</h3>
        {!cm ? <div className="empty">{t('noMom')}</div> : (<div className="ms" onMouseEnter={pauseM} onTouchStart={pauseM}>
          <img className="sqimg" key={cm.id} src={img(cm.image_path)} alt="" onClick={() => setGi(moms.indexOf(cm))} />
          <button className="msb l" onClick={() => stepM(-1)} aria-label="prev">◀</button><button className="msb r" onClick={() => stepM(1)} aria-label="next">▶</button>
          <small>{moms.indexOf(cm) + 1}/{moms.length}</small></div>)}</div>
    </div>
    <People inline />
    <div className="card"><div className="big">{s.total} {t('teamsRegistered')}</div>
      <div>✓ {t('verifiedT')}: {s.verified}</div><div>{t('notVerifiedT')}: {s.not_verified}</div><small>{t('fee')}</small></div>
    <h2>{t('contactTitle')}</h2>
    {CONTACTS.map((x, i) => (<div className="card" key={x.num}><b>{x.name}</b> · {t(x.role)}{i !== 0 && <div dir="ltr">{x.disp}</div>}
      <div style={{ marginTop: 8 }}><a className="btn" href={`https://wa.me/${i === 0 && c.falak_whatsapp ? c.falak_whatsapp : x.num}?text=${encodeURIComponent((i === 0 && c.falak_msg) || t(x.msg))}`} target="_blank" rel="noopener noreferrer">{i === 0 ? (c.falak_btn || t('askFalak')) : t('wa')}</a></div></div>))}
    {qs.length > 0 && qs[qi] && <section className="quotes" onMouseEnter={pauseQ} onTouchStart={pauseQ}>
      <h2>اقوالِ امام علیؑ و تعلیماتِ اہلِ بیتؑ</h2>
      <div className="qt" key={qs[qi].id} dir="rtl" lang="ur">
        <div className="qn">قول نمبر {qi + 1}</div>
        <p className="qb">{qs[qi].body}</p>
        <div className="qr">کتاب: {qs[qi].book}</div><div className="qr">حوالہ: {qs[qi].ref}</div></div>
      <div className="row quote-controls" dir="ltr"><button className="btn alt quote-nav quote-prev" onClick={() => stepQ(-1)} aria-label="Previous quote" title="Previous quote"><span aria-hidden="true">←</span></button>
        <span>{qi + 1} / {qs.length}</span><button className="btn alt quote-nav quote-next" onClick={() => stepQ(1)} aria-label="Next quote" title="Next quote"><span aria-hidden="true">→</span></button></div></section>}
    {allAnn && <div className="modal" onClick={() => setAllAnn(false)}><div className="mbox" onClick={e => e.stopPropagation()}>
      <button className="btn alt" onClick={() => setAllAnn(false)}>✕ {t('close')}</button>
      {ann.map(a => (<div className="alist" key={a.id} onClick={() => { setAllAnn(false); setLb(a); }}><img src={img(a.image_path)} alt="" /><div><b>{a.title}</b><div><small>{a.announce_date}</small></div></div></div>))}</div></div>}
    {lb && <div className="modal" onClick={() => setLb(null)}><div className="mbox" onClick={e => e.stopPropagation()}>
      <button className="btn alt" onClick={() => setLb(null)}>✕ {t('close')}</button>
      <img src={img(lb.image_path)} alt={lb.title} style={{ width: '100%', borderRadius: 10, marginTop: 8 }} /><h3>{lb.title}</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{lb.description}</p><small>{lb.announce_date}</small>
      <div style={{ marginTop: 10 }}><a className="btn" href={`https://wa.me/?text=${encodeURIComponent(lb.title + ' – ' + (typeof window !== 'undefined' ? window.location.href : ''))}`} target="_blank" rel="noopener noreferrer">{t('share')}</a></div></div></div>}
    {gi !== null && moms[gi] && <div className="modal" onClick={() => setGi(null)}><div className="mbox" onClick={e => e.stopPropagation()}>
      <div className="row" style={{ justifyContent: 'space-between' }}><button className="btn alt" onClick={() => step(-1)}>◀</button>
        <button className="btn alt" onClick={() => setGi(null)}>✕</button><button className="btn alt" onClick={() => step(1)}>▶</button></div>
      <img src={img(moms[gi].image_path)} alt="" style={{ width: '100%', borderRadius: 10 }} />
      <p>{moms[gi].caption}</p><small>{moms[gi].moment_date}</small></div></div>}
    {tmSel && <div className="modal" onClick={() => setTmSel(null)}><div className="mbox" onClick={e => e.stopPropagation()}>
      <button className="btn alt" onClick={() => setTmSel(null)}>✕ {t('close')}</button>
      <h3>{tmSel.name} <small>{tmSel.reg_id}</small></h3>
      <span className={'badge ' + (tmSel.verified ? 'v' : 'n')}>{tmSel.verified ? '✓ ' + t('verifiedBadge') : t('notVerifiedBadge')}</span>
      <div className="pgrid">{(tmSel.players || []).map((p, i) => (<div key={i} className="pl"><img className="ph sm" src={pubP(p.photo)} alt="" /><div>{p.name}</div>
        <small>{t(LBL[p.position])} · {p.age}</small>{i < 2 && <small> ★ {t(i === 0 ? 'cap1' : 'cap2')}</small>}</div>))}</div></div></div>}
  </>);
}
