'use client';
import { useMemo, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { CONTACTS } from '../../lib/config';

const FAQ = [
  { keys:['register','registration','team','رجسٹریشن','ٹیم'], q:'How do I register my team?', a:'Open Register Your Team on the homepage, complete the team and player details, and submit the form. Your registration is then reviewed by the BJL organizer.' },
  { keys:['login','password','captain','لاگ ان','پاسورڈ'], q:'How does the captain login work?', a:'Captain accounts are created manually by the BJL organizer after registration. Use the registered captain email and the password shared securely by the organizer.' },
  { keys:['payment','fee','screenshot','ادائیگی','فیس'], q:'How can I check payment status?', a:'Open Team Login with your captain account. Your payment status and any rejection reason are shown in your team area.' },
  { keys:['objection','appeal','player','اعتراض','اپیل'], q:'How can a captain submit an objection?', a:'Sign in to Team Login, open Report an Objection / Appeal, select the opposing registered team and player, choose a reason, and provide clear details. The admin reviews it.' },
  { keys:['rules','prize','قواعد','انعام'], q:'Where can I see rules and prizes?', a:'Check the Rules and Prizes sections on the BJL homepage. If information has not been published yet, it will be marked as coming soon.' },
  { keys:['message','contact','whatsapp','رابطہ','پیغام'], q:'How do I contact the organizer?', a:'Use the WhatsApp contact options listed below or send a private message from your captain dashboard after signing in.' }
];

export default function Help() {
  const { t } = useLang(); const [question,setQuestion]=useState(''); const [answer,setAnswer]=useState(''); const [history,setHistory]=useState([]);
  const matches = useMemo(() => { const q=question.trim().toLowerCase(); if(!q) return []; return FAQ.filter(f=>f.keys.some(k=>q.includes(k.toLowerCase())) || f.q.toLowerCase().split(' ').some(w=>w.length>3&&q.includes(w))); },[question]);
  function ask(e){e.preventDefault(); const q=question.trim(); if(!q)return; const found=matches[0]; const a=found?found.a:'I could not find an exact answer in the current BJL help guide. Please use the WhatsApp contacts below or message the organizer from your captain account. This free help assistant uses approved FAQ information and does not access private team records.'; setAnswer(a); setHistory(v=>[{q,a},...v].slice(0,5));}
  return (<><h2>{t('helpTitle')}</h2>
    <section className="card"><h3>BJL Help Assistant</h3><p>Ask about team registration, captain login, payment, objections, rules or prizes. This free assistant searches the published help guide. It is not a generative AI and does not access private records.</p>
      <form onSubmit={ask}><label htmlFor="bjl-help-question">Your question</label><input id="bjl-help-question" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="How do I register my team?" /><button className="btn" type="submit">Ask BJL Help</button></form>
      {answer && <div className="card" aria-live="polite"><b>Answer</b><p>{answer}</p></div>}
      {history.length>0 && <div><h4>Recent questions</h4>{history.map((h,i)=><div className="card" key={i}><b>{h.q}</b><p>{h.a}</p></div>)}</div>}
      <h4>Quick questions</h4>{FAQ.map(f=><button type="button" className="btn alt" key={f.q} style={{margin:'4px'}} onClick={()=>{setQuestion(f.q);setAnswer(f.a);}}>{f.q}</button>)}
    </section>
    {CONTACTS.map(c => (<div className="card" key={c.num}>
      <div className="help-contact-name">{c.name}</div><div className="help-contact-role">{t(c.role)}</div><div className="help-contact-number" dir="ltr">{c.disp}</div>
      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <a className="btn" href={`https://wa.me/${c.num}?text=${encodeURIComponent(t(c.msg))}`} target="_blank" rel="noopener noreferrer">{t('wa')}</a>
      </div></div>))}
  </>);
}
