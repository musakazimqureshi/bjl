'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/date';
const pub = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
const ROLE = { batter: 'Batsman', bowler: 'Bowler', all_rounder: 'All-Rounder', wicket_keeper: 'Wicketkeeper' };
export default function TeamLogin() {
  const { lang } = useLang(); const tx = (e, u) => (lang === 'ur' ? u : e);
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null); const [teams, setTeams] = useState(null); const [objections, setObjections] = useState([]); const [opponents, setOpponents] = useState([]); const [opponentId, setOpponentId] = useState(''); const [playerId, setPlayerId] = useState(''); const [reason, setReason] = useState(''); const [details, setDetails] = useState(''); const [sending, setSending] = useState(false); const [matches, setMatches] = useState([]); const [teamMessages, setTeamMessages] = useState([]); const [replyText, setReplyText] = useState(''); const [replyBusy, setReplyBusy] = useState(false);
  async function load(u) {
    const { data, error } = await supabase.from('teams').select('*, players:players!players_team_id_fkey(*), payments(*)').eq('captain_email', (u.email || '').toLowerCase());
    if (error) setMsg(error.message); setTeams(data || []);
    const ownIds = (data || []).map(t => t.id);
    if (ownIds.length) {
      const [otherResult, objectionResult, messageResult] = await Promise.all([
        supabase.from('teams').select('id,name,players:players!players_team_id_fkey(id,name,age,position)').not('id','in', '(' + ownIds.join(',') + ')').order('name'),
        supabase.from('player_objections').select('*').order('created_at',{ascending:false}),
        supabase.from('team_messages').select('*').in('team_id',ownIds).order('created_at',{ascending:false})
      ]);
      setOpponents(otherResult.data || []); if (otherResult.error) setMsg(otherResult.error.message);
      if (objectionResult.error) setMsg(objectionResult.error.message);
      else {
        const objectionRows = objectionResult.data || [];
        const relatedTeamIds = [...new Set(objectionRows.flatMap(o => [o.source_team_id, o.team_id]).filter(Boolean))];
        const relatedPlayerIds = [...new Set(objectionRows.map(o => o.player_id).filter(Boolean))];
        const [{ data: objectionTeams }, { data: objectionPlayers }] = await Promise.all([
          relatedTeamIds.length ? supabase.from('teams').select('id,name').in('id', relatedTeamIds) : Promise.resolve({ data: [] }),
          relatedPlayerIds.length ? supabase.from('players').select('id,name,age').in('id', relatedPlayerIds) : Promise.resolve({ data: [] })
        ]);
        const teamById = Object.fromEntries((objectionTeams || []).map(x => [x.id, x]));
        const playerById = Object.fromEntries((objectionPlayers || []).map(x => [x.id, x]));
        setObjections(objectionRows.map(o => ({ ...o, teams: teamById[o.team_id] || null, players: playerById[o.player_id] || null })));
      }
      setTeamMessages(messageResult.data || []); if (messageResult.error) setMsg(messageResult.error.message);
      const { data: matchRows, error: matchError } = await supabase.from('matches').select('id,team_a,team_b,winner_team,match_date,published').or('team_a.in.(' + ownIds.join(',') + '),team_b.in.(' + ownIds.join(',') + ')');
      setMatches(matchRows || []); if (matchError) setMsg(matchError.message);
    } else { setOpponents([]); setObjections([]); setTeamMessages([]); setMatches([]); }
  }
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) { setUser(session.user); load(session.user); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user || null);
      if (session?.user) load(session.user);
      else setTeams(null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function login(e) {
    e.preventDefault(); setMsg('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) return setMsg(tx('Wrong email or password.', 'ای میل یا پاسورڈ غلط ہے۔'));
    setUser(data.user); load(data.user);
  }
  async function submitObjection(e, ownTeam) {
    e.preventDefault(); setSending(true); setMsg('');
    try {
      if (!opponentId || !playerId || !reason || details.trim().length < 10) throw new Error(tx('Select an opposing team, player, reason and provide at least 10 characters of detail.', 'مخالف ٹیم، کھلاڑی، وجہ منتخب کریں اور کم از کم 10 حروف کی تفصیل لکھیں۔'));
      const { error } = await supabase.from('player_objections').insert({
        source_team_id: ownTeam.id, team_id: opponentId, player_id: playerId,
        reason, details: details.trim(), raised_by: (user.email || '').toLowerCase(), status: 'open'
      });
      if (error) throw error;
      setMsg(tx('Your objection has been submitted for admin review.', 'آپ کا اعتراض ایڈمن کے جائزے کے لیے جمع ہو گیا ہے۔'));
      setReason(''); setDetails(''); setOpponentId(''); setPlayerId('');
      const { data, error: refreshError } = await supabase.from('player_objections').select('*').order('created_at',{ascending:false});
      if (refreshError) setMsg(refreshError.message);
      else {
        const relatedTeamIds = [...new Set((data || []).flatMap(o => [o.source_team_id, o.team_id]).filter(Boolean))];
        const relatedPlayerIds = [...new Set((data || []).map(o => o.player_id).filter(Boolean))];
        const [{ data: objectionTeams }, { data: objectionPlayers }] = await Promise.all([
          relatedTeamIds.length ? supabase.from('teams').select('id,name').in('id', relatedTeamIds) : Promise.resolve({ data: [] }),
          relatedPlayerIds.length ? supabase.from('players').select('id,name,age').in('id', relatedPlayerIds) : Promise.resolve({ data: [] })
        ]);
        const teamById = Object.fromEntries((objectionTeams || []).map(x => [x.id, x]));
        const playerById = Object.fromEntries((objectionPlayers || []).map(x => [x.id, x]));
        setObjections((data || []).map(o => ({ ...o, teams: teamById[o.team_id] || null, players: playerById[o.player_id] || null })));
      }
    } catch (err) { setMsg(err.message || 'Could not submit objection.'); }
    finally { setSending(false); }
  }
  async function sendTeamReply(e, ownTeam) {
    e.preventDefault(); setReplyBusy(true);
    const { error } = await supabase.from('team_messages').insert({team_id:ownTeam.id,sender_role:'captain',message:replyText.trim()});
    if (error) setMsg(error.message); else { setReplyText(''); setMsg(tx('Reply sent to admin.','جواب ایڈمن کو بھیج دیا گیا۔')); const {data}=await supabase.from('team_messages').select('*').eq('team_id',ownTeam.id).order('created_at',{ascending:false}); setTeamMessages(data||[]); }
    setReplyBusy(false);
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
      {msg && <div className="err">{msg}</div>}<button className="btn">{tx('Login', 'لاگ اِن')}</button></form>) : (<>
      <button className="btn alt" onClick={logout}>{tx('Logout', 'لاگ آؤٹ')}</button>
      {teams && teams.length === 0 && <div className="card">{tx('No team is linked to this email yet. Please contact the organizer.', 'اس ای میل سے کوئی ٹیم جڑی ہوئی نہیں۔ براہ کرم منتظم سے رابطہ کریں۔')}</div>}
      {(teams || []).map(tm => { const teamMatches = matches.filter(m => m.team_a === tm.id || m.team_b === tm.id); const wins = teamMatches.filter(m => m.winner_team === tm.id).length; const losses = teamMatches.filter(m => m.winner_team && m.winner_team !== tm.id).length; const ps = (tm.players || []).slice().sort((a, b) => a.seq - b.seq); return (
        <div className="card" key={tm.id}><h3>{tm.name} <small>{tm.reg_id}</small></h3>
          <span className={'badge ' + (tm.payment === 'verified' ? 'v' : 'n')}>{tm.payment === 'verified' ? '✓ VERIFIED' : 'NOT VERIFIED'}</span>
          <p>{status(tm)}</p><div className="card"><h3>{tx('Team Statistics','ٹیم کے اعدادوشمار')}</h3><div className="row"><span>{tx('Matches','میچز')}: <b>{teamMatches.length}</b></span><span>{tx('Wins','جیت')}: <b>{wins}</b></span><span>{tx('Losses','ہار')}: <b>{losses}</b></span></div><small>{tx('Based on recorded match results.','درج شدہ میچ نتائج کی بنیاد پر۔')}</small></div>
          {tm.payment !== 'verified' && <Link className="btn" href={'/pay?ref=' + tm.reg_id}>{tx('Go to Payment', 'ادائیگی کے صفحے پر جائیں')}</Link>}
                    <section className="card">
            <h3>{tx('Messages from Admin','ایڈمن کے پیغامات')}</h3>
            {teamMessages.length ? teamMessages.map(m=><div className="card" key={m.id}><p>{m.message}</p><small>{formatDateTime(m.created_at)} · {m.sender_role==='admin'?tx('Admin','ایڈمن'):tx('Your reply','آپ کا جواب')}</small></div>) : <p>{tx('No messages yet.','ابھی کوئی پیغام نہیں۔')}</p>}
            <form onSubmit={e=>sendTeamReply(e,tm)}><label>{tx('Reply to Admin','ایڈمن کو جواب دیں')}</label><textarea required minLength={1} maxLength={4000} rows={3} value={replyText} onChange={e=>setReplyText(e.target.value)} /><button className="btn" disabled={replyBusy}>{replyBusy?tx('Sending...','بھیج رہا ہے...'):tx('Send Reply','جواب بھیجیں')}</button></form>
          </section>
<section className="card">
            <h3>{tx('Report an Objection / Appeal', 'اعتراض یا اپیل جمع کریں')}</h3>
            <p>{tx('Select an opposing registered team and the player you want the admin to review.', 'مخالف رجسٹرڈ ٹیم اور اس کھلاڑی کو منتخب کریں جس کا ایڈمن سے جائزہ کروانا ہے۔')}</p>
            <form onSubmit={e => submitObjection(e, tm)}>
              <label>{tx('Opposing Team', 'مخالف ٹیم')}</label>
              <select required value={opponentId} onChange={e => {setOpponentId(e.target.value);setPlayerId('');}}><option value="">{tx('Select team','ٹیم منتخب کریں')}</option>{opponents.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
              <label>{tx('Player', 'کھلاڑی')}</label>
              <select required value={playerId} onChange={e=>setPlayerId(e.target.value)}><option value="">{tx('Select player','کھلاڑی منتخب کریں')}</option>{(opponents.find(o=>o.id===opponentId)?.players||[]).map(p=><option key={p.id} value={p.id}>{p.name} · {p.age}</option>)}</select>
              <label>{tx('Reason', 'وجہ')}</label>
              <select required value={reason} onChange={e=>setReason(e.target.value)}><option value="">{tx('Select reason','وجہ منتخب کریں')}</option>{['Over Age','Senior Player','Ineligible Player','Incorrect Information','Other'].map(x=><option key={x}>{x}</option>)}</select>
              <label>{tx('Details', 'تفصیل')}</label><textarea required minLength={10} rows={4} value={details} onChange={e=>setDetails(e.target.value)} placeholder={tx('Explain your objection clearly...','اپنا اعتراض واضح طور پر لکھیں...')} />
              <button className="btn" disabled={sending}>{sending?tx('Submitting...','جمع ہو رہا ہے...'):tx('Submit Objection','اعتراض جمع کریں')}</button>
            </form>
            <h3>{tx('My Objections / Appeal History','میرے اعتراضات اور اپیلز')}</h3>
            {objections.length ? objections.map(o=><div className="card" key={o.id}><b>{o.teams?.name || tx('Opposing team','مخالف ٹیم')}</b><p>{o.players?.name} · {o.reason}</p><small>{formatDateTime(o.created_at)} · {o.status || 'open'}</small>{o.admin_note && <p>{tx('Admin note: ','ایڈمن نوٹ: ')}{o.admin_note}</p>}</div>) : <p>{tx('No objections submitted yet.','ابھی کوئی اعتراض جمع نہیں کیا گیا۔')}</p>}
          </section>
          <div className="pgrid">{ps.map((p, i) => (<div key={p.id} className="pl"><img className="ph sm" src={pub(p.photo_path)} alt="" /><div>{p.name}</div>
            <small>{ROLE[p.position]} · {p.age}</small>{i < 2 && <small dir="ltr"> ★ {p.mobile}</small>}</div>))}</div></div>); })}</>)}
  </>);
}
