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
  const [directory, setDirectory] = useState([]); const [appealPlayer, setAppealPlayer] = useState('');
  const [appealReason, setAppealReason] = useState('Over Age'); const [appealDetails, setAppealDetails] = useState('');
  const [newPassword, setNewPassword] = useState(''); const [accountMsg, setAccountMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function load(u) {
    const { data, error } = await supabase.from('teams').select('*, players:players!players_team_id_fkey(*), payments(*)').eq('captain_email', (u.email || '').toLowerCase());
    if (error) setMsg(error.message); setTeams(data || []);
    const { data: roster, error: rosterError } = await supabase.rpc('captain_appeal_directory');
    if (!rosterError) setDirectory(roster || []);
  }
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => { if (active && session) { setUser(session.user); load(session.user); } });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session && session.user) { setUser(session.user); load(session.user); }
      else { setUser(null); setTeams(null); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  async function login(e) {
    e.preventDefault(); setMsg('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) return setMsg(tx('Wrong email or password.', 'ای میل یا پاسورڈ غلط ہے۔'));
    setUser(data.user); load(data.user);
  }
  async function submitAppeal(e, sourceTeam) {
    e.preventDefault(); setAccountMsg(''); setBusy(true);
    const target = directory.find(x => x.player_id === appealPlayer);
    if (!target || target.team_id === sourceTeam.id || !appealDetails.trim()) { setBusy(false); return setAccountMsg('Please select an opposing player and enter full details.'); }
    const { error } = await supabase.from('player_objections').insert({
      player_id: target.player_id, team_id: target.team_id, source_team_id: sourceTeam.id,
      reason: appealReason, details: appealDetails.trim(), raised_by: user.email, status: 'open'
    });
    setBusy(false);
    if (error) return setAccountMsg('Appeal could not be submitted: ' + error.message);
    setAppealPlayer(''); setAppealDetails(''); setAccountMsg('Appeal submitted to BJL Admin for review.');
  }
  async function changePassword(e) {
    e.preventDefault(); setAccountMsg('');
    if (newPassword.length < 12) return setAccountMsg('New password must be at least 12 characters.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) return setAccountMsg(error.message);
    setNewPassword(''); setAccountMsg('Your team login password has been changed successfully.');
  }
  async function logout() { await supabase.auth.signOut(); setUser(null); setTeams(null); setDirectory([]); }
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
      {msg && <div className="err">{msg}</div>}<button className="btn">{tx('Login', 'لاگ اِن')}</button></form>) : (<>
      <button className="btn alt" onClick={logout}>{tx('Logout', 'لاگ آؤٹ')}</button>
      {user && <div className="card team-account-card"><h3>Account Security</h3><p dir="ltr">{user.email}</p><form onSubmit={changePassword}><label>{tx('Set a new password (12+ characters)', 'نیا پاسورڈ رکھیں (کم از کم 12 حروف)')}</label><input type="password" minLength="12" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={tx('New password', 'نیا پاسورڈ')} required /><button className="btn" disabled={busy || newPassword.length < 12}>{tx('Change Password', 'پاسورڈ تبدیل کریں')}</button></form>{accountMsg && <p role="status">{accountMsg}</p>}</div>}
      {teams && teams.length === 0 && <div className="card">{tx('No team is linked to this email yet. Please contact the organizer.', 'اس ای میل سے کوئی ٹیم جڑی ہوئی نہیں۔ براہ کرم منتظم سے رابطہ کریں۔')}</div>}
      {(teams || []).map(tm => { const ps = (tm.players || []).slice().sort((a, b) => a.seq - b.seq); return (
        <div className="card" key={tm.id}><h3>{tm.name} <small>{tm.reg_id}</small></h3>
          <span className={'badge ' + (tm.payment === 'verified' ? 'v' : 'n')}>{tm.payment === 'verified' ? '✓ VERIFIED' : 'NOT VERIFIED'}</span>
          <p>{status(tm)}</p>
          <div className="team-stat-strip"><div><small>Players</small><b>{ps.length}</b></div><div><small>Squad target</small><b>15</b></div><div><small>Payment</small><b>{tm.payment === 'verified' ? 'Verified' : 'Pending'}</b></div></div>
          <div className="card team-appeal-card"><h4>{tx('Submit an Appeal', 'اعتراض / اپیل جمع کریں')}</h4><p>{tx('Select a player from another team, choose the reason and provide supporting details. BJL Admin will review it.', 'کسی دوسری ٹیم کا کھلاڑی منتخب کریں، وجہ اور مکمل تفصیل لکھیں۔ BJL ایڈمن اس کا جائزہ لے گا۔')}</p>
            <form onSubmit={e => submitAppeal(e, tm)}>
              <label>{tx('Opposing team player', 'دوسری ٹیم کا کھلاڑی')}</label>
              <select required value={appealPlayer} onChange={e => setAppealPlayer(e.target.value)}><option value="">{tx('Select player', 'کھلاڑی منتخب کریں')}</option>{directory.map(p => <option key={p.player_id} value={p.player_id}>{p.team_name} · {p.player_name} · {p.player_age}</option>)}</select>
              <label>{tx('Appeal reason', 'اپیل کی وجہ')}</label>
              <select value={appealReason} onChange={e => setAppealReason(e.target.value)}><option>Over Age</option><option>Senior Player</option><option>Community Misconduct</option><option>Eligibility Concern</option><option>Other</option></select>
              <label>{tx('Details / Evidence', 'تفصیل / ثبوت')}</label><textarea required rows="3" value={appealDetails} onChange={e => setAppealDetails(e.target.value)} placeholder={tx('Explain clearly why you are submitting this appeal…', 'اپیل کی وجہ واضح طور پر لکھیں…')} />
              <button className="btn" disabled={busy || !appealPlayer || !appealDetails.trim()}>{busy ? tx('Submitting…', 'جمع ہو رہا ہے…') : tx('Submit Appeal to Admin', 'ایڈمن کو اپیل بھیجیں')}</button>
            </form>{accountMsg && <p role="status">{accountMsg}</p>}
          </div>
          {tm.payment !== 'verified' && <Link className="btn" href={'/pay?ref=' + tm.reg_id}>{tx('Go to Payment', 'ادائیگی کے صفحے پر جائیں')}</Link>}
          <div className="pgrid">{ps.map((p, i) => (<div key={p.id} className="pl"><img className="ph sm" src={pub(p.photo_path)} alt="" /><div>{p.name}</div>
            <small>{ROLE[p.position]} · {p.age}</small>{i < 2 && <small dir="ltr"> ★ {p.mobile}</small>}</div>))}</div></div>); })}</>)}
  </>);
}
