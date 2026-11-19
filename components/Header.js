'use client';
import Link from 'next/link';
import { useLang } from '../lib/i18n';
export default function Header() {
  const { t, lang, setLang } = useLang();
  return (<header className="hdr">
    <Link href="/" className="logo"><span className="shield">BJL</span><b>S1</b></Link>
    <nav><Link href="/">{t('home')}</Link><Link href="/register">{t('register')}</Link><Link href="/teams">{t('teams')}</Link><Link href="/pay">{t('payment')}</Link><Link href="/team">{t('teamLogin')}</Link><Link href="/admin">Admin</Link></nav>
    <button className="lang" onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}>{lang === 'en' ? 'اردو' : 'English'}</button>
  </header>);
}
