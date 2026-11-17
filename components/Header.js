'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import { usePathname } from 'next/navigation';
export default function Header() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = e => {
      if (e.key === 'Escape') setMenuOpen(false);
      if (e.key === 'Tab' && menuRef.current) {
        const nodes = menuRef.current.querySelectorAll('a[href],button:not([disabled])');
        if (!nodes.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    menuRef.current?.querySelector('a')?.focus();
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKeyDown); };
  }, [menuOpen]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (<header className={`hdr${scrolled ? ' is-scrolled' : ''}`}>
    <Link href="/" className="logo" aria-label="Battagram Junior League home"><span className="shield">BJL</span><b>S1</b></Link>
    <button className="nav-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="bjl-main-nav" onClick={() => setMenuOpen(v => !v)}><span></span><span></span><span></span></button>
    {menuOpen && <button className="nav-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
    <nav id="bjl-main-nav" ref={menuRef} className={menuOpen ? 'mobile-open' : ''} aria-label="Main navigation"><Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>{t('home')}</Link><Link href="/register" aria-current={pathname === '/register' ? 'page' : undefined}>{t('register')}</Link><Link href="/teams" aria-current={pathname === '/teams' ? 'page' : undefined}>{t('teams')}</Link><Link href="/pay" aria-current={pathname === '/pay' ? 'page' : undefined}>{t('payment')}</Link><Link href="/team" aria-current={pathname === '/team' ? 'page' : undefined}>{t('teamLogin')}</Link><Link href="/admin" aria-current={pathname?.startsWith('/admin') ? 'page' : undefined}>Admin</Link></nav>
    {!pathname?.startsWith('/admin') && <button className="lang" type="button" onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}>{lang === 'en' ? 'اردو' : 'English'}</button>}
  </header>);
}
