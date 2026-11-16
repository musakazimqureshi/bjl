'use client';
import { useEffect, useState } from 'react';
// Welcome splash: shown only on the visitor's first visit (remembered in the browser), fades out after ~5 seconds. Tap to skip.
export default function Splash() {
  const [gone, setGone] = useState(false); const [fade, setFade] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = !!localStorage.getItem('bjl_welcome_v1'); localStorage.setItem('bjl_welcome_v1', '1'); } catch (e) {}
    if (seen) { setGone(true); return; }
    const a = setTimeout(() => setFade(true), 4600); const b = setTimeout(() => setGone(true), 5300);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (gone) return null;
  return (<div className={'splash' + (fade ? ' fade' : '')} onClick={() => setGone(true)} role="presentation">
    <div className="sp-in"><div className="sp-t">Welcome to<br />BJL Season 1</div><div className="sp-s">Organized by Falak</div></div></div>);
}
