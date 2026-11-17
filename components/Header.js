'use client';
import Link from 'next/link';
import { useLang } from '../lib/i18n';
import { usePathname } from 'next/navigation';
export default function Header() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  return (<header className="hdr">
    <Link href="/" className="logo"><span className="shield">BJL</span><b>S1</b></Link>
    <nav><Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>{t('home')}</Link><Link href="/register" aria-current={pathname === '/register' ? 'page' : undefined}>{t('register')}</Link><Link href="/teams" aria-current={pathname === '/teams' ? 'page' : undefined}>{t('teams')}</Link><Link href="/pay" aria-current={pathname === '/pay' ? 'page' : undefined}>{t('payment')}</Link><Link href="/team" aria-current={pathname === '/team' ? 'page' : undefined}>{t('teamLogin')}</Link><Link href="/admin" aria-current={pathname?.startsWith('/admin') ? 'page' : undefined}>Admin</Link></nav>
    {!pathname?.startsWith('/admin') && <button className="lang" onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}>{lang === 'en' ? 'اردو' : 'English'}</button>}
  </header>);
}
