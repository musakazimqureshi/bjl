'use client';
import { useEffect, useState } from 'react';

const KEY = 'bjl-cookie-choice-v1';
const GA_ID = 'G-4DGKQNDFXY';

function enableAnalytics() {
  if (typeof window === 'undefined' || window.__bjlAnalyticsLoaded) return;
  window.__bjlAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(script);
}

export default function CookieConsent() {
  const [choice, setChoice] = useState(null);
  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === 'accepted' || saved === 'rejected') {
      setChoice(saved);
      if (saved === 'accepted') enableAnalytics();
    }
  }, []);
  function choose(value) {
    localStorage.setItem(KEY, value);
    setChoice(value);
    if (value === 'accepted') enableAnalytics();
  }
  if (choice) return null;
  return <aside className="bjl-cookie-consent" role="dialog" aria-label="Cookie preferences">
    <div><b>Cookie preferences</b><p>We use essential browser storage to keep site features working. Optional analytics cookies help us understand website visits. You can accept or reject optional analytics.</p></div>
    <div className="bjl-cookie-actions">
      <button type="button" className="btn" onClick={() => choose('accepted')}>Accept cookies</button>
      <button type="button" className="btn alt" onClick={() => choose('rejected')}>Reject optional</button>
    </div>
  </aside>;
}
