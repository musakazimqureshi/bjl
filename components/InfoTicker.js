'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function InfoTicker() {
  const pathname = usePathname();
  const [total, setTotal] = useState(null);
  useEffect(() => {
    let active = true;
    supabase.rpc('public_stats').then(({ data }) => {
      if (active && data && Number.isFinite(Number(data.total))) setTotal(Number(data.total));
    });
    return () => { active = false; };
  }, []);
  if (pathname?.startsWith('/admin')) return null;
  const items = ['TAPE BALL CRICKET', 'ENTRY FEE · RS. 5,000', 'VENUE · DAB GROUND, BATTAGRAM'];
  if (total !== null && total > 0) items.push(`TEAMS REGISTERED · ${total}`);
  return <div className="bjl-ticker" aria-label="BJL tournament information"><div className="bjl-ticker-track">{[...items, ...items].map((item, i) => <span key={i}><i aria-hidden="true" />{item}</span>)}<a className="bjl-ticker-register" href="/register">REGISTER YOUR TEAM ↗</a><a className="bjl-ticker-register" href="/register">REGISTER YOUR TEAM ↗</a></div></div>;
}
