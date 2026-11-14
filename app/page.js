'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
export default function Home() {
  const { t } = useLang();
  const [s, setS] = useState({ confirmed: 0, open: true });
  useEffect(() => { supabase.rpc('public_stats').then(({ data }) => data && setS(data)); }, []);
  const full = s.confirmed >= 30 || !s.open;
  return (<>
    <section className="hero">
      <div className="ayat" lang="ar" dir="rtl">لَا فَتَى إِلَّا عَلِيٌّ لَا سَيْفَ إِلَّا ذُو الْفَقَارِ</div>
      <div className="shield" style={{display:'inline-block',fontSize:'2rem'}}>BJL</div>
      <h1>{t('title')}</h1><p>{t('season')}</p><p>{t('loc')}</p>
      <div className="row">
        {!full && <Link href="/register" className="btn">{t('regBtn')}</Link>}
        <Link href="/teams" className="btn alt">{t('viewBtn')}</Link>
      </div>
    </section>
    <div className="card"><div>{t('reg')}</div><div className="big">{s.confirmed} / 30</div>
      <div>{t('slots')}: {Math.max(0, 30 - s.confirmed)}</div></div>
    {full && <div className="warn">{t('closed')}</div>}
    <div className="card">{t('fee')}</div>
  </>);
}
