'use client';
import { useEffect, useRef, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { CONTACTS } from '../../lib/config';

const makeId = () => {
  let id = localStorage.getItem('bjl-ai-visitor');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('bjl-ai-visitor', id); }
  return id;
};

export default function Help() {
  const { t } = useLang();
  const [visitor, setVisitor] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(30);
  const [error, setError] = useState('');
  const bottom = useRef(null);
  useEffect(() => {
    const id = makeId(); setVisitor(id);
    try { const saved = JSON.parse(localStorage.getItem('bjl-ai-history-' + id) || '[]'); if (Array.isArray(saved)) setMessages(saved.filter(m => ['user','assistant'].includes(m.role) && typeof m.content === 'string').slice(-200)); } catch (_) {}
    fetch('/api/ai-help', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitor: id, checkOnly: true }) })
      .then(r => r.ok ? r.json() : null).then(data => { if (data && Number.isFinite(data.remaining)) setRemaining(data.remaining); }).catch(() => {});
  }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);
  useEffect(() => { if (visitor) { try { localStorage.setItem('bjl-ai-history-' + visitor, JSON.stringify(messages.slice(-200))); } catch (_) {} } }, [visitor, messages]);
  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy || !visitor) return;
    setInput(''); setError('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next); setBusy(true);
    try {
      const res = await fetch('/api/ai-help', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitor, messages: next.slice(-200) }), signal: AbortSignal.timeout(40000) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send your message.');
      setMessages(v => [...v, { role: 'assistant', content: data.reply }]);
      setRemaining(data.remaining);
    } catch (err) {
      setMessages(v => v.slice(0, -1));
      setInput(text);
      setError(err.message);
    } finally { setBusy(false); }
  }
  return <div className="bjl-help-page">
    <section className="bjl-ai-card">
      <div className="bjl-ai-heading"><span className="bjl-ai-mark">BJL</span><div><h2>AI Help Center</h2><p>Ask about registration, teams, payments and tournament information.</p></div></div>
      <div className="bjl-ai-quota">{remaining} messages remaining today (resets daily)</div>
      <div className="bjl-ai-messages" aria-live="polite">
        {messages.length === 0 && <div className="bjl-ai-welcome"><b>Assalam-o-Alaikum!</b><p>Main Falak's AI Assistant hoon. BJL registration, teams, 15-player squad, matches aur payment ke hawale se main aapki madad kar sakta hoon. Aap apna sawal bejhijhak poochhein.</p></div>}
        {messages.map((m,i)=><div className={'bjl-ai-message '+m.role} key={i}><small>{m.role==='user'?'You':"Falak's AI Assistant"}</small><p>{m.content}</p></div>)}
        {busy && <div className="bjl-ai-typing">BJL Assistant is typing…</div>}
        <div ref={bottom} />
      </div>
      {error && <p className="bjl-ai-error" role="alert">{error}</p>}
      <form className="bjl-ai-form" onSubmit={send}><textarea value={input} onChange={e=>setInput(e.target.value)} maxLength={1200} rows={2} placeholder="Write your question…" disabled={busy || remaining===0} /><button className="btn" disabled={busy || !input.trim() || remaining===0}>Send</button></form>
      <p className="bjl-ai-footnote">Text only. No voice, photos or file uploads. Authorized BJL admins may review chats for support quality. Email and phone details are masked in reports. Please do not share passwords, OTPs or private information.</p>
    </section>
    <div className="bjl-direct-whatsapp"><b>Need a person to help?</b><p>BJL tournament help ke liye WhatsApp par seedha message bhejein.</p><a className="btn" href="https://wa.me/923145453155?text=Assalam-o-Alaikum%2C%20I%20need%20help%20with%20BJL%20tournament." target="_blank" rel="noopener noreferrer">WhatsApp Help ↗</a></div>
    <h3>{t('helpTitle')}</h3>
    {CONTACTS.map(c => <div className="card" key={c.num}><b>{c.name}</b> · {t(c.role)}<div dir="ltr">{c.disp}</div><div className="row" style={{justifyContent:'flex-start'}}><a className="btn" href={`https://wa.me/${c.num}?text=${encodeURIComponent(t(c.msg))}`} target="_blank" rel="noopener noreferrer">{t('wa')}</a></div></div>)}
  </div>;
}
