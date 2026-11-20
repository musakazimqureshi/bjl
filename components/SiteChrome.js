'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';
import People from './People';
import FloatingWA from './FloatingWA';
import Splash from './Splash';
import MotionObserver from './MotionObserver';
import ScrollProgress from './ScrollProgress';

export default function SiteChrome({ children }) {
  const pathname = usePathname();
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return children;
  return (
    <>
      <Splash />
      <ScrollProgress />
      <MotionObserver />
      <Header />
      <main>{children}<People /></main>
      <FloatingWA />
      <footer className="credit"><strong>OFFICIAL WEBSITE · BATTAGRAM JUNIOR LEAGUE</strong><span> BJL SEASON 1 · ORGANIZED FOR THE CRICKET COMMUNITY OF BATTAGRAM</span></footer>
    </>
  );
}
