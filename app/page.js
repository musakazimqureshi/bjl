'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { CONTACTS } from '../lib/config';
const fmt = tm => { if (!tm) return ''; const [h, m] = tm.split(':'); const hh = +h; return `${((hh + 11) % 12) + 1}:${m} ${hh >= 12 ? 'PM' : 'AM'}`; };
const img = p => supabase.storage.from('announcements').getPublicUrl(p).data.publicUrl;
export default function Home() {
  const { t } = useLang();
  const [s, setS] = useState({ total: 0, verified: 0, not_verified: 0, open: true });
  const [c, setC] = useState({}); const [ann, setAnn] = useState([]);
  useEffect(() => {
    supabase.rpc('public_stats').then(({ data }) => data && setS(data));
    supabase.rpc('public_content').then(({ data }) => data && setC(data));
    supabase.rpc('public_announcements').then(({ data }) => data && setAnn(data));
  }, []);
  const ph = n => c['photo' + n + '_path'] && <div className="frame"><img src={img(c['photo' + n + '_path'])} alt="" /></div>;
  return (<>
    <section className="hero">
      <div className="ayat" lang="ar" dir="rtl">لَا فَتَى إِلَّا عَلِيٌّ لَا سَيْفَ إِلَّا ذُو الْفَقَارِ</div>
      <div className="shield" style={{display:'inline-block',fontSize:'2rem'}}>BJL</div>
      <h1>{t('title')}</h1><p>{t('season')}</p><p>{t('loc')}</p>
      <div className="row">
        <Link href="/register" className="btn">{t('regBtn')}</Link>
        <Link href="/teams" className="btn alt">{t('viewBtn')}</Link>
      </div>
    </section>
    <div className="card"><div className="big">{s.total} {t('teamsRegistered')}</div>
      <div>✓ {t('verifiedT')}: {s.verified}</div><div>{t('notVerifiedT')}: {s.not_verified}</div></div>
    <div className="two">
      <div className="card mc"><h3>{t('todayWinner')}</h3>
        {c.winner_team ? (<><div className="team">🏆 {c.winner_team}</div>
          {c.loser_team && <div className="lose">{t('defeated')}: {c.loser_team}</div>}</>) : <div>{t('soon')}</div>}</div>
      <div className="card mc"><h3>{t('nextMatch')}</h3>
        {c.next_a && c.next_b ? (<><div className="team">{c.next_a}</div><div className="vsx">{t('vs')}</div><div className="team">{c.next_b}</div>
          <div>{c.next_date} {c.next_time && '· ' + fmt(c.next_time)}</div></>) : <div>{t('soon')}</div>}</div>
    </div>
    {ph(1)}
    <h2>{t('annTitle')}</h2>
    {ann.length === 0 && <div className="card">{t('noAnn')}</div>}
    {ann.map(a => (<div className="card ann" key={a.id}>
      <img src={img(a.image_path)} alt={a.title} /><h3>{a.title}</h3>
      {a.description && <p>{a.description}</p>}<small>{a.announce_date} {fmt(a.announce_time)}</small></div>))}
    {ph(2)}
    <h2>{t('contactTitle')}</h2>
    {CONTACTS.map((x, i) => (<div className="card" key={x.num}><b>{x.name}</b> · {t(x.role)}{i !== 0 && <div dir="ltr">{x.disp}</div>}
      <div style={{ marginTop: 8 }}><a className="btn" href={`https://wa.me/${i === 0 && c.falak_whatsapp ? c.falak_whatsapp : x.num}?text=${encodeURIComponent(t(x.msg))}`} target="_blank" rel="noopener noreferrer">{i === 0 ? (c.falak_btn || t('askFalak')) : t('wa')}</a></div></div>))}
    <div className="card">{t('fee')}</div>
  </>);
}
