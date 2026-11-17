'use client';
import { useEffect, useRef, useState } from 'react';
export default function AnimatedNumber({ value = 0 }) {
 const ref=useRef(null); const [display,setDisplay]=useState(0);
 useEffect(()=>{
  const node=ref.current, target=Math.max(0,Number(value)||0);
  if(!node)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)){setDisplay(target);return;}
  let frame=0,start=0,active=false;
  const animate=now=>{if(!start)start=now;const p=Math.min(1,(now-start)/900);setDisplay(Math.round(target*(1-Math.pow(1-p,3))));if(p<1)frame=requestAnimationFrame(animate);};
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!active){active=true;frame=requestAnimationFrame(animate);observer.disconnect();}},{threshold:.35});
  observer.observe(node);return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[value]);
 return <span ref={ref} aria-label={String(value)}>{display.toLocaleString()}</span>;
}
