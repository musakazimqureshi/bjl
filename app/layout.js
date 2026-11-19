import './globals.css';
import { LangProvider } from '../lib/i18n';
import SiteChrome from '../components/SiteChrome';
export const metadata = { metadataBase: new URL('https://bjl-alpha.vercel.app'), title: 'Battagram Junior League – Season 1', description: 'BJL tape ball cricket tournament', alternates: { canonical: '/' }, openGraph: { title: 'Battagram Junior League – Season 1', description: 'Register your team, see results, announcements and match photos.', url: 'https://bjl-alpha.vercel.app/', siteName: 'Battagram Junior League', type: 'website' }, twitter: { card: 'summary_large_image', title: 'Battagram Junior League – Season 1', description: 'BJL tape ball cricket tournament' } };
export default function RootLayout({ children }) {
  return (<html lang="en" suppressHydrationWarning><head><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Aref+Ruqaa:wght@700&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" /></head>
    <body><LangProvider><SiteChrome>{children}</SiteChrome></LangProvider></body></html>);
}
