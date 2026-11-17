'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { CONTACTS } from '../lib/config';
export default function FloatingWA() {
  const path = usePathname(); const [c, setC] = useState({});
  useEffect(() => { supabase.rpc('public_content').then(({ data }) => data && setC(data)); }, []);
  if ((path || '').startsWith('/admin')) return null;
  const num = (c.falak_whatsapp && c.falak_whatsapp !== '923411620498') ? c.falak_whatsapp : CONTACTS[0].num;
  return <a className="fwa" href={`https://wa.me/${num}?text=${encodeURIComponent(c.falak_msg || '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">💬 {c.falak_btn || 'Ask Falak'}</a>;
}
