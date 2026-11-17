'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import { usePathname } from 'next/navigation';
export default function Header() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (<header className={`hdr${scrolled ? ' is-scrolled' : ''}`}>
    <Link href="/" className="logo" aria-label="Battagram Junior League home"><span className="shield">BJL</span><b>S1</b></Link>
    <nav aria-label="Main navigation"><Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>{t('home')}</Link><Link href="/register" aria-current={pathname === '/register' ? 'page' : undefined}>{t('register')}</Link><Link href="/teams" aria-current={pathname === '/teams' ? 'page' : undefined}>{t('teams')}</Link><Link href="/pay" aria-current={pathname === '/pay' ? 'page' : undefined}>{t('payment')}</Link><Link href="/team" aria-current={pathname === '/team' ? 'page' : undefined}>{t('teamLogin')}</Link><Link href="/admin" aria-current={pathname?.startsWith('/admin') ? 'page' : undefined}>Admin</Link></nav>
    {!pathname?.startsWith('/admin') && <button className="lang" type="button" onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}>{lang === 'en' ? 'اردو' : 'English'}</button>}
  </header>);
}
