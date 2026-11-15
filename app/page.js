'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { CONTACTS } from '../lib/config';
const fmt = tm => { if (!tm) return ''; const [h, m] = tm.split(':'); const hh = +h; return `${((hh + 11) % 12) + 1}:${m} ${hh >= 12 ? 'PM' : 'AM'}`; };
const img = p => supabase.storage.from('announcements').getPublicUrl(p).data.publicUrl;
const PEOPLE = [{ k: 1, name: 'AMAN MALIK', role: 'MEMBER' }, { k: 2, name: 'WALEED AFRIDI', role: 'MEMBER' },
  { k: 3, name: 'MUHAMMAD HASNAIN', role: 'MEMBER' }, { k: 4, name: 'FALAK', role: 'ORGANIZER' }];
export default function Home() {
  const { t } = useLang();
  const [s, setS] = useState({ total: 0, verified: 0, not_verified: 0 });
  const [c, setC] = useState({}); const [ann, setAnn] = useState([]); const [moms, setMoms] = useState([]);
  const [lb, setLb] = useState(null); const [gi, setGi] = useState(null);
  const [qs, setQs] = useState([]); const [qi, setQi] = useState(0); const [hold, setHold] = useState(false);
  useEffect(() => {
    supabase.rpc('public_stats').then(({ data }) => data && setS(data));
    supabase.rpc('public_content').then(({ data }) => data && setC(data));
    supabase.rpc('public_announcements').then(({ data }) => data && setAnn(data));
    supabase.rpc('public_moments').then(({ data }) => data && setMoms(data));
    supabase.rpc('public_quotes').then(({ data }) => data && setQs(data));
  }, []);
  const groups = moms.reduce((g, m) => { (g[m.moment_date] = g[m.moment_date] || []).push(m); return g; }, {});
  const hasPeople = PEOPLE.some(p => c['person' + p.k + '_path']);
  useEffect(() => { if (qs.length < 2 || hold) return; const id = setInterval(() => setQi(i => (i + 1) % qs.length), 9000); return () => clearInterval(id); }, [qs.length, hold]);
  const pauseQ = () => { setHold(true); clearTimeout(window.__qh); window.__qh = setTimeout(() => setHold(false), 15000); };
  const stepQ = d => { pauseQ(); setQi(i => (i + d + qs.length) % qs.length); };
  const step = d => setGi(i => (i + d + moms.length) % moms.length);
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
      </div>
    </section>
    <div className="card"><div className="big">{s.total} {t('teamsRegistered')}</div>
      <div>✓ {t('verifiedT')}: {s.verified}</div><div>{t('notVerifiedT')}: {s.not_verified}</div><small>{t('fee')}</small></div>
    <div className="two">
      {c.winner_show !== '0' && c.winner_team && <div className="card mc"><h3>{t('todayWinner')}</h3>
        <div className="team">🏆 {c.winner_team}</div>
        {c.loser_team && <div className="lose">{t('defeated')}: {c.loser_team}</div>}
        {c.winner_date && <small>{t('matchDate')}: {c.winner_date}</small>}</div>}
      {c.next_show !== '0' && c.next_a && c.next_b && <div className="card mc"><h3>{t('nextMatch')}</h3>
        <div className="team">{c.next_a}</div><div className="vsx">{t('vs')}</div><div className="team">{c.next_b}</div>
        <div>{c.next_date} {c.next_time && '· ' + fmt(c.next_time)}</div></div>}
    </div>
    {ann.length > 0 && <><h2>{t('annTitle')}</h2>
      <div className="two">{ann.map(a => (<div className="card ann" key={a.id} onClick={() => setLb(a)} style={{ cursor: 'pointer' }}>
        <img src={img(a.image_path)} alt={a.title} loading="lazy" /><h3>{a.title}</h3>
        {a.description && <p>{a.description.length > 90 ? a.description.slice(0, 90) + '…' : a.description}</p>}<small>{a.announce_date}</small></div>))}</div></>}
    {moms.length > 0 && <><h2>{t('momentsT')}</h2>
      {Object.keys(groups).map(d => (<div key={d}><small>{d}</small><div className="mom">{groups[d].map(m => (
        <img key={m.id} src={img(m.image_path)} alt={m.caption || ''} loading="lazy" onClick={() => setGi(moms.findIndex(x => x.id === m.id))} />))}</div></div>))}</>}
    {hasPeople && <><h2>{t('orgT')}</h2><div className="ppl">{PEOPLE.map(p => (<div key={p.k} className={'pp' + (p.role === 'ORGANIZER' ? ' org' : '')}>
      {c['person' + p.k + '_path'] ? <img src={img(c['person' + p.k + '_path'])} alt="" loading="lazy" /> : <div className="pimg ph">{p.name[0]}</div>}
      <b>{p.name}</b><div className="role">{p.role}</div></div>))}</div></>}
    <h2>{t('contactTitle')}</h2>
    {CONTACTS.map((x, i) => (<div className="card" key={x.num}><b>{x.name}</b> · {t(x.role)}{i !== 0 && <div dir="ltr">{x.disp}</div>}
      <div style={{ marginTop: 8 }}><a className="btn" href={`https://wa.me/${i === 0 && c.falak_whatsapp ? c.falak_whatsapp : x.num}?text=${encodeURIComponent((i === 0 && c.falak_msg) || t(x.msg))}`} target="_blank" rel="noopener noreferrer">{i === 0 ? (c.falak_btn || t('askFalak')) : t('wa')}</a></div></div>))}
    {qs.length > 0 && qs[qi] && <section className="quotes" onMouseEnter={pauseQ} onTouchStart={pauseQ}>
      <h2>اقوالِ امام علیؑ و تعلیماتِ اہلِ بیتؑ</h2>
      <div className="qt" key={qs[qi].id} dir="rtl" lang="ur">
        <div className="qn">قول نمبر {qi + 1}</div>
        <p className="qb">{qs[qi].body}</p>
        <div className="qr">کتاب: {qs[qi].book}</div><div className="qr">حوالہ: {qs[qi].ref}</div></div>
      <div className="row"><button className="btn alt" onClick={() => stepQ(-1)} aria-label="پچھلا">▶</button>
        <span>{qi + 1} / {qs.length}</span><button className="btn alt" onClick={() => stepQ(1)} aria-label="اگلا">◀</button></div></section>}
    {lb && <div className="modal" onClick={() => setLb(null)}><div className="mbox" onClick={e => e.stopPropagation()}>
      <button className="btn alt" onClick={() => setLb(null)}>✕ {t('close')}</button>
      <img src={img(lb.image_path)} alt={lb.title} style={{ width: '100%', borderRadius: 10, marginTop: 8 }} /><h3>{lb.title}</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{lb.description}</p><small>{lb.announce_date}</small></div></div>}
    {gi !== null && moms[gi] && <div className="modal" onClick={() => setGi(null)}><div className="mbox" onClick={e => e.stopPropagation()}>
      <div className="row" style={{ justifyContent: 'space-between' }}><button className="btn alt" onClick={() => step(-1)}>◀</button>
        <button className="btn alt" onClick={() => setGi(null)}>✕</button><button className="btn alt" onClick={() => step(1)}>▶</button></div>
      <img src={img(moms[gi].image_path)} alt="" style={{ width: '100%', borderRadius: 10 }} />
      <p>{moms[gi].caption}</p><small>{moms[gi].moment_date}</small></div></div>}
  </>);
}
