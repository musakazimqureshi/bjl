'use client';
import { useEffect, useRef } from 'react';
export default function HeroMotion(){
 const ref=useRef(null);
 useEffect(()=>{
  const hero=ref.current?.closest('.hero');
  if(!hero||window.matchMedia('(prefers-reduced-motion: reduce)').matches||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
  let raf=0,x=0,y=0;
  const move=e=>{const r=hero.getBoundingClientRect();x=((e.clientX-r.left)/r.width-.5)*5;y=((e.clientY-r.top)/r.height-.5)*5;if(!raf)raf=requestAnimationFrame(()=>{hero.style.setProperty('--hero-parallax-x',x.toFixed(2)+'px');hero.style.setProperty('--hero-parallax-y',y.toFixed(2)+'px');raf=0;});};
  const reset=()=>{if(raf)cancelAnimationFrame(raf);raf=0;hero.style.setProperty('--hero-parallax-x','0px');hero.style.setProperty('--hero-parallax-y','0px');};
  hero.addEventListener('pointermove',move,{passive:true});hero.addEventListener('pointerleave',reset,{passive:true});
  return()=>{hero.removeEventListener('pointermove',move);hero.removeEventListener('pointerleave',reset);reset();};
 },[]);
 return <svg ref={ref} className="bjl-hero-ball" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="bjlBall" cx="32%" cy="26%"><stop offset="0" stopColor="#ff7777"/><stop offset=".48" stopColor="#c51b27"/><stop offset="1" stopColor="#570812"/></radialGradient></defs><circle cx="50" cy="50" r="43" fill="url(#bjlBall)"/><path d="M23 14Q55 50 77 86M14 25Q50 58 86 75" fill="none" stroke="#f7e7d0" strokeWidth="2.8" strokeDasharray="4 4"/></svg>;
}
