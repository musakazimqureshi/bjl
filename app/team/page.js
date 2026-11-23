'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
const pub = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
const ROLE = { batter: 'Batsman', bowler: 'Bowler', all_rounder: 'All-Rounder', wicket_keeper: 'Wicketkeeper' };
export default function TeamLogin() {
  const { lang } = useLang(); const tx = (e, u) => (lang === 'ur' ? u : e);
  const [username, setUsername] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null); const [teams, setTeams] = useState(null);
  const [directory, setDirectory] = useState([]); const [teamMatches, setTeamMatches] = useState([]); const [teamMessages, setTeamMessages] = useState([]); const [replyDraft, setReplyDraft] = useState(''); const [replyBusy, setReplyBusy] = useState(false); const [appealPlayer, setAppealPlayer] = useState('');
  const [appealReason, setAppealReason] = useState('Over Age'); const [appealDetails, setAppealDetails] = useState('');
  const [newPassword, setNewPassword] = useState(''); const [accountMsg, setAccountMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function load(u) {
    const teamId = u.app_metadata?.team_id;
    if (!teamId || u.app_metadata?.role !== 'captain') {
      setMsg('This account is not linked to a BJL team. Contact the organizer.');
      setTeams([]);
      return;
    }
    const { data, error } = await supabase.from('teams').select('*, players:players!players_team_id_fkey(*), payments(*)').eq('id', teamId);
    if (error) setMsg(error.message);
    setTeams(data || []);
    const { data: matchRows, error: matchError } = await supabase.from('matches').select('*').or('team_a.eq.' + teamId + ',team_b.eq.' + teamId).order('match_date', { ascending: true });
    if (!matchError) setTeamMatches(matchRows || []);
    const { data: messages } = await supabase.from('team_messages').select('*').eq('team_id', teamId).order('created_at', { ascending: true }); setTeamMessages(messages || []);
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
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{4,24}$/.test(clean)) return setMsg(tx('Enter the username given by BJL Admin.', 'ایڈمن کا دیا ہوا درست یوزرنیم درج کریں۔'));
    const { data, error } = await supabase.auth.signInWithPassword({ email: clean + '@bjl-login.com', password: pw });
    if (error) return setMsg(tx('Wrong username or password.', 'یوزرنیم یا پاسورڈ غلط ہے۔'));
    if (data.user?.app_metadata?.role !== 'captain' || !data.user?.app_metadata?.team_id) {
      await supabase.auth.signOut({ scope: 'local' });
      return setMsg(tx('This account is not a BJL captain account.', 'یہ بی جے ایل کپتان کا اکاؤنٹ نہیں ہے۔'));
    }
    setUser(data.user); load(data.user);
  }
  async function sendTeamReply(e, team) { e.preventDefault(); const message = replyDraft.trim(); if (!message) return; setReplyBusy(true); const { error } = await supabase.from('team_messages').insert({ team_id: team.id, sender_role: 'captain', message }); setReplyBusy(false); if (error) return setAccountMsg('Reply could not be sent: ' + error.message); setReplyDraft(''); const { data } = await supabase.from('team_messages').select('*').eq('team_id', team.id).order('created_at', { ascending: true }); setTeamMessages(data || []); setAccountMsg('Your reply has been sent to BJL Admin.'); }
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
      <p>{tx('Use the username and password created by BJL Admin. Gmail is not required.', 'بی جے ایل ایڈمن کا دیا ہوا یوزرنیم اور پاسورڈ استعمال کریں۔ جی میل ضروری نہیں۔')}</p>
      <label>{tx('Team Username', 'ٹیم یوزرنیم')}</label><input placeholder="Username" autoCapitalize="none" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} dir="ltr" required />
      <input placeholder={tx('Password', 'پاسورڈ')} type="password" value={pw} onChange={e => setPw(e.target.value)} dir="ltr" />
      {msg && <div className="err">{msg}</div>}<button className="btn">{tx('Login', 'لاگ اِن')}</button></form>) : (<>
      <button className="btn alt" onClick={logout}>{tx('Logout', 'لاگ آؤٹ')}</button>
      {user && <div className="card team-account-card"><h3>Account Security</h3><p dir="ltr">Username: {user.email?.split('@')[0]}</p><form onSubmit={changePassword}><label>{tx('Set a new password (12+ characters)', 'نیا پاسورڈ رکھیں (کم از کم 12 حروف)')}</label><input type="password" minLength="12" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={tx('New password', 'نیا پاسورڈ')} required /><button className="btn" disabled={busy || newPassword.length < 12}>{tx('Change Password', 'پاسورڈ تبدیل کریں')}</button></form>{accountMsg && <p role="status">{accountMsg}</p>}</div>}
      {teams && teams.length === 0 && <div className="card">{tx('No team is linked to this login yet. Please contact the organizer.', 'اس ای میل سے کوئی ٹیم جڑی ہوئی نہیں۔ براہ کرم منتظم سے رابطہ کریں۔')}</div>}
      {(teams || []).map(tm => {
        const ps = (tm.players || []).slice().sort((a, b) => a.seq - b.seq);
        const ownMatches = teamMatches.filter(m => m.team_a === tm.id || m.team_b === tm.id);
        const completed = ownMatches.filter(m => !!m.winner_team);
        const wins = completed.filter(m => m.winner_team === tm.id).length;
        const losses = completed.filter(m => m.winner_team && m.winner_team !== tm.id).length;
        const upcoming = ownMatches.filter(m => !m.winner_team && m.match_date && m.match_date >= new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Karachi'}));
        const winRate = completed.length ? Math.round(wins / completed.length * 100) : 0;
        return (
        <div className="card" key={tm.id}><h3>{tm.name} <small>{tm.reg_id}</small></h3>
          <span className={'badge ' + (tm.payment === 'verified' ? 'v' : 'n')}>{tm.payment === 'verified' ? '✓ VERIFIED' : 'NOT VERIFIED'}</span>
          <p>{status(tm)}</p>
          <section className="card team-appeal-card"><h4>✉ Message from Falak</h4><p>Official messages and instructions from BJL Admin appear here.</p><div className="team-message-thread">{teamMessages.map(m => <article key={m.id} className={'team-message-bubble ' + (m.sender_role === 'admin' ? 'from-admin' : 'from-team')}><b>{m.sender_role === 'admin' ? 'Message from Falak' : 'Your Reply'}</b><p style={{ whiteSpace:'pre-wrap' }}>{m.message}</p><small>{new Date(m.created_at).toLocaleString()}</small></article>)}{teamMessages.length === 0 && <p>No messages from admin yet.</p>}</div><form onSubmit={e => sendTeamReply(e, tm)}><label>Reply to Admin</label><textarea rows="3" value={replyDraft} onChange={e => setReplyDraft(e.target.value)} placeholder="Write your reply..." /><button className="btn" disabled={replyBusy || !replyDraft.trim()}>{replyBusy ? 'Sending...' : 'Send Reply'}</button></form></section>
          <section className="card" style={{marginTop:18,padding:18,background:'linear-gradient(135deg,#10233f,#1d4770)',color:'#fff',borderRadius:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}><div><small style={{opacity:.8}}>BJL-01 TEAM PERFORMANCE</small><h3 style={{color:'#fff',margin:'5px 0'}}>Live Team Statistics</h3></div><span className="badge v">LIVE DATA</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(105px,1fr))',gap:10,marginTop:14}}>
              {[['Matches',ownMatches.length],['Won',wins],['Lost',losses],['Upcoming',upcoming.length],['Win Rate',winRate+'%'],['Players',ps.length]].map(([label,value])=><div key={label} style={{background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.15)',borderRadius:12,padding:12}}><small style={{opacity:.82}}>{label}</small><div style={{fontSize:25,fontWeight:800,marginTop:5}}>{value}</div></div>)}
            </div>
            <p style={{fontSize:12,opacity:.75,marginBottom:0}}>Statistics are calculated from published BJL match records. A match is counted as completed only when a winner is recorded.</p>
          </section>
          <div className="team-stat-strip"><div><small>Payment</small><b>{tm.payment === 'verified' ? 'Verified' : 'Pending'}</b></div><div><small>Played</small><b>{completed.length}</b></div><div><small>Squad</small><b>{ps.length}/15</b></div></div>
          <section className="card" style={{marginTop:14,padding:16,borderRadius:16}}><h4>🏏 Match Centre</h4>{ownMatches.length ? ownMatches.map(m=>{const isA=m.team_a===tm.id;const opponentId=isA?m.team_b:m.team_a;const opponent=teams.find(x=>x.id===opponentId);const result=m.winner_team===tm.id?'WON':m.winner_team?'LOST': 'UPCOMING';return <div key={m.id} style={{padding:'12px 0',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><b>{opponent?.name || 'BJL Opponent'}</b><div><small>{m.match_date || 'Date TBA'} {m.match_time || ''} · {m.kind || 'Match'}</small></div>{m.result_note && <small>{m.result_note}</small>}</div><b style={{color:result==='WON'?'#16834a':result==='LOST'?'#c0392b':'#2563eb'}}>{result}</b></div>}) : <p>No match records available yet.</p>}<button className="btn alt" onClick={()=>load(user)}>Refresh Statistics</button></section>
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
