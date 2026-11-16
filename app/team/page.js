'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
const pub = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
const ROLE = { batter: 'Batsman', bowler: 'Bowler', all_rounder: 'All-Rounder', wicket_keeper: 'Wicketkeeper' };
export default function TeamLogin() {
  const { lang } = useLang(); const tx = (e, u) => (lang === 'ur' ? u : e);
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null); const [teams, setTeams] = useState(null);
  async function load(u) {
    const { data, error } = await supabase.from('teams').select('*, players:players!players_team_id_fkey(*), payments(*)').eq('captain_email', (u.email || '').toLowerCase());
    if (error) setMsg(error.message); setTeams(data || []);
  }
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) { setUser(session.user); load(session.user); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) { setUser(session.user); queueMicrotask(() => load(session.user)); }
      else { setUser(null); setTeams(null); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function login(e) {
    e.preventDefault(); setMsg('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) return setMsg(tx('Wrong email or password.', 'ای میل یا پاسورڈ غلط ہے۔'));
    setUser(data.user); load(data.user);
  }
  async function logout() { await supabase.auth.signOut(); setUser(null); setTeams(null); }
  const status = tm => {
    const last = (tm.payments || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    if (tm.payment === 'verified') return tx('Payment verified ✓', 'ادائیگی تصدیق شدہ ✓');
    if (tm.payment === 'rejected') return tx('Payment rejected: ', 'ادائیگی مسترد: ') + (tm.payment_rejection_reason || '');
    if (tm.payment === 'submitted' || last) return tx('Payment submitted – waiting for admin check', 'ادائیگی جمع ہو گئی – ایڈمن کی تصدیق کا انتظار');
    return tx('Payment pending', 'ادائیگی پینڈنگ');
  };
  return (<>
    <h2>{tx('Team Login', 'ٹیم لاگ اِن')}</h2>
    {!user ? (<form className="card" onSubmit={login}>
      <p>{tx('Your login is created by the organizer. Use the Gmail you gave at registration.', 'آپ کا لاگ اِن منتظم بناتا ہے۔ وہی جی میل استعمال کریں جو رجسٹریشن میں دیا تھا۔')}</p>
      <input placeholder="Gmail" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
      <input placeholder={tx('Password', 'پاسورڈ')} type="password" value={pw} onChange={e => setPw(e.target.value)} dir="ltr" />
      <p><Link href="/reset-password?role=team">{tx('Forgot Password?', 'پاسورڈ بھول گئے؟')}</Link></p>
      {msg && <div className="err">{msg}</div>}<button className="btn">{tx('Login', 'لاگ اِن')}</button></form>) : (<>
      <button className="btn alt" onClick={logout}>{tx('Logout', 'لاگ آؤٹ')}</button>
      {teams && teams.length === 0 && <div className="card">{tx('No team is linked to this email yet. Please contact the organizer.', 'اس ای میل سے کوئی ٹیم جڑی ہوئی نہیں۔ براہ کرم منتظم سے رابطہ کریں۔')}</div>}
      {(teams || []).map(tm => { const ps = (tm.players || []).slice().sort((a, b) => a.seq - b.seq); return (
        <div className="card" key={tm.id}><h3>{tm.name} <small>{tm.reg_id}</small></h3>
          <span className={'badge ' + (tm.status === 'approved' ? 'v' : 'n')}>{tm.status === 'approved' ? tx('Team approved ✓', 'ٹیم منظور شدہ ✓') : tx('Team verification pending', 'ٹیم کی تصدیق زیرِ انتظار')}</span>
          <p>{status(tm)}</p>
          {tm.payment !== 'verified' && <Link className="btn" href={'/pay?ref=' + tm.reg_id}>{tx('Go to Payment', 'ادائیگی کے صفحے پر جائیں')}</Link>}
          <div className="pgrid">{ps.map((p, i) => (<div key={p.id} className="pl"><img className="ph sm" src={pub(p.photo_path)} alt="" /><div>{p.name}</div>
            <small>{ROLE[p.position]} · {p.age}</small>{i < 2 && <small dir="ltr"> ★ {p.mobile}</small>}</div>))}</div></div>); })}</>)}
  </>);
}
