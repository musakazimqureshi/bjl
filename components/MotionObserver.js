'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
export default function MotionObserver(){
 const pathname=usePathname();
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nodes=[...document.querySelectorAll('.hero,.duo,.card,.official-group,.orgs,.quotes,.pp')];
  nodes.forEach((el,i)=>{el.classList.add('motion-item');if(el.classList.contains('card')||el.classList.contains('pp')){el.classList.add('motion-card');el.style.setProperty('--reveal-delay',(i%4)*65+'ms')}});
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');io.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});
  nodes.forEach(el=>io.observe(el));
  return ()=>{io.disconnect();nodes.forEach(el=>{el.classList.remove('motion-item','motion-card','in-view');el.style.removeProperty('--reveal-delay')})};
 },[pathname]);
 return null;
}