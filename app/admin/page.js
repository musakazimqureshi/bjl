'use client';
import { useEffect, useState } from 'react';
import { adminSupabase as supabase } from '../../lib/adminSupabase';
import { shrink } from '../../lib/img';
const ext = f => (f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg');
const okImg = f => f && ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 15 * 1024 * 1024;
export default function Admin() {
  const [ready, setReady] = useState(false); const [isAdmin, setIsAdmin] = useState(false); const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('teams'); const [c, setC] = useState({}); const [ann, setAnn] = useState([]); const [teams, setTeams] = useState([]); const [qs, setQs] = useState([]); const [qf, setQf] = useState({ body: '', book: 'نہج البلاغہ (سید رضیؒ)', ref: '' }); const [moms, setMoms] = useState([]); const [mf, setMf] = useState({ caption: '', date: '', files: [] });
  const [f, setF] = useState({ title: '', description: '', date: '', time: '', file: null });
  const [objections, setObjections] = useState([]); const [objectionPlayer, setObjectionPlayer] = useState(null); const [objectionDraft, setObjectionDraft] = useState({ reason: '', raised_by: '', details: '' });
  async function check() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      setLogged(!!session);
      if (!session) {
        setIsAdmin(false);
      } else {
        const { data, error } = await supabase.from('admins').select('id').eq('id', session.user.id).maybeSingle();
        if (error) throw error;
        setIsAdmin(!!data);
      }
    } catch (error) {
      setLogged(false);
      setIsAdmin(false);
      setMsg(error?.message || 'Could not verify login.');
    } finally {
      setReady(true);
    }
  }
  async function load() {
    const { data } = await supabase.rpc('public_content'); setC(data || {});
    const { data: a } = await supabase.from('announcements').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }); setAnn(a || []);
    const { data: m } = await supabase.from('moments').select('*').order('moment_date', { ascending: false }).order('created_at', { ascending: false }); setMoms(m || []);
    const { data: q } = await supabase.from('quotes').select('*').order('sort_order', { ascending: true }); setQs(q || []);
  }
  async function loadTeams() {
    const { data } = await supabase.from('teams').select('*, players:players!players_team_id_fkey(*), payments(*)').order('created_at', { ascending: false });
    setTeams(data || []);
  }
  async function loadObjections() {
    const { data, error } = await supabase.from('player_objections').select('*, players(name, age), teams(name)').order('created_at', { ascending: false });
    if (error) { setMsg(error.message); return; }
    setObjections(data || []);
  }
  async function raiseObjection(e, player, team) {
    e.preventDefault();
    const { error } = await supabase.from('player_objections').insert({
      player_id: player.id, team_id: team.id, reason: objectionDraft.reason,
      raised_by: objectionDraft.raised_by.trim(), details: objectionDraft.details.trim()
    });
    if (error) return setMsg(error.message);
    setMsg('Player objection recorded successfully.');
    setObjectionPlayer(null);
    setObjectionDraft({ reason: '', raised_by: '', details: '' });
    loadObjections();
  }
  async function setObjectionStatus(item, status) {
    const { error } = await supabase.from('player_objections').update({
      status, resolved_at: status === 'open' ? null : new Date().toISOString()
    }).eq('id', item.id);
    setMsg(error ? error.message : 'Objection status updated.');
    loadObjections();
  }
  const pub = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
  async function shot(pay) {
    const { data, error } = await supabase.storage.from('payments').createSignedUrl(pay.screenshot_path, 600);
    if (error) return setMsg(error.message); window.open(data.signedUrl, '_blank');
  }
  async function setPay(tm, status) {
    let reason = null;
    if (status === 'rejected') { reason = prompt('Enter the rejection reason'); if (!reason) return; }
    const last = (tm.payments || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    const val = status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : (last ? 'submitted' : 'pending');
    const { error } = await supabase.from('teams').update({ payment: val, payment_rejection_reason: reason }).eq('id', tm.id);
    if (!error && last) await supabase.from('payments').update({ status: val === 'verified' ? 'verified' : val === 'rejected' ? 'rejected' : 'submitted', rejection_reason: reason }).eq('id', last.id);
    setMsg(error ? error.message : 'Done ✔'); loadTeams();
  }
  async function delTeam(tm) {
    if (!confirm('Permanently delete this entire team?')) return;
    const { error } = await supabase.from('teams').delete().eq('id', tm.id); setMsg(error ? error.message : 'Team deleted'); loadTeams();
  }
  useEffect(() => { check(); }, []);
  useEffect(() => { if (isAdmin) { load(); loadTeams(); loadObjections(); } }, [isAdmin]);
  async function login(e) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) return setMsg(error.message);
    setPw('');
    await check();
  }
  async function logout() { await supabase.auth.signOut(); setLogged(false); setIsAdmin(false); }
  const set = (k, v) => setC(x => ({ ...x, [k]: v }));
  async function save(keys) {
    setMsg('');
    const { error } = await supabase.from('settings').upsert(keys.map(k => ({ key: k, value: c[k] || '' })));
    setMsg(error ? error.message : 'محفوظ Done ✔');
  }
  async function uploadKey(key, file) {
    setMsg(''); if (!okImg(file)) return setMsg('Image must be JPG, PNG, or WEBP.');
    const path = `site/${key}-${Date.now()}.jpg`; const blob = await shrink(file, 1100);
    const { error } = await supabase.storage.from('announcements').upload(path, blob, { contentType: 'image/jpeg' }); if (error) return setMsg(error.message);
    const { error: e2 } = await supabase.from('settings').upsert({ key: key + '_path', value: path });
    setMsg(e2 ? e2.message : 'Image uploaded ✔'); load();
  }
  async function clearKey(key) { await supabase.from('settings').upsert({ key: key + '_path', value: '' }); setMsg('Removed'); load(); }
  async function move(i, d) {
    const arr = ann.slice(); const j = i + d; if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    await Promise.all(arr.map((x, k) => supabase.from('announcements').update({ sort_order: k }).eq('id', x.id))); load();
  }
  async function editAnn(x) {
    const t = prompt('Title', x.title); if (t === null) return; const d = prompt('Description', x.description || ''); if (d === null) return;
    await supabase.from('announcements').update({ title: t, description: d }).eq('id', x.id); load();
  }
  async function addMoments(e) {
    e.preventDefault(); setMsg('');
    if (!mf.files.length || !mf.date) return setMsg('Date and images are required.');
    setMsg('Uploading, please wait...');
    for (const [i, file] of Array.from(mf.files).entries()) {
      if (!okImg(file)) return setMsg('ہر Image must be JPG, PNG, or WEBP.');
      const path = `moments/${Date.now()}-${i}.jpg`; const blob = await shrink(file, 1400);
      const { error } = await supabase.storage.from('announcements').upload(path, blob, { contentType: 'image/jpeg' }); if (error) return setMsg(error.message);
      const { error: e2 } = await supabase.from('moments').insert({ image_path: path, caption: mf.caption, moment_date: mf.date }); if (e2) return setMsg(e2.message);
    }
    setMf({ caption: '', date: '', files: [] }); e.target.reset(); setMsg('Photos published ✔'); load();
  }
  async function addQuote(e) {
    e.preventDefault(); if (!qf.body.trim() || !qf.ref.trim()) return setMsg('Quote text and reference are required.');
    const { error } = await supabase.from('quotes').insert({ body: qf.body.trim(), book: qf.book, ref: qf.ref.trim(), sort_order: qs.length + 1 });
    setMsg(error ? error.message : 'قول شامل Done ✔'); setQf({ ...qf, body: '', ref: '' }); load();
  }
  async function editQuote(x) {
    const b = prompt('Quote Text', x.body); if (b === null) return; const k = prompt('Book', x.book); if (k === null) return; const r = prompt('حوالہ', x.ref); if (r === null) return;
    await supabase.from('quotes').update({ body: b, book: k, ref: r }).eq('id', x.id); load();
  }
  async function togQuote(x) { await supabase.from('quotes').update({ published: !x.published }).eq('id', x.id); load(); }
  async function delQuote(x) { if (!confirm('Delete this quote?')) return; await supabase.from('quotes').delete().eq('id', x.id); load(); }
  async function moveQuote(i, d) {
    const arr = qs.slice(); const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]];
    await Promise.all(arr.map((x, k) => supabase.from('quotes').update({ sort_order: k + 1 }).eq('id', x.id))); load();
  }
  async function delMoment(m) { if (!confirm('Delete this image?')) return; await supabase.storage.from('announcements').remove([m.image_path]); await supabase.from('moments').delete().eq('id', m.id); load(); }
  async function togMoment(m) { await supabase.from('moments').update({ published: !m.published }).eq('id', m.id); load(); }
  async function capMoment(m) { const v = prompt('Caption', m.caption || ''); if (v === null) return; await supabase.from('moments').update({ caption: v }).eq('id', m.id); load(); }
  async function addAnn(e) {
    e.preventDefault(); setMsg('');
    if (!f.title.trim() || !f.date || !okImg(f.file)) return setMsg('Title, date, and image (JPG/PNG, up to 15 MB) are required.');
    const path = `ann/${Date.now()}.jpg`; const blob = await shrink(f.file, 1400);
    const { error } = await supabase.storage.from('announcements').upload(path, blob, { contentType: 'image/jpeg' }); if (error) return setMsg(error.message);
    const { error: e2 } = await supabase.from('announcements').insert({ title: f.title.trim(), description: f.description, image_path: path, announce_date: f.date, announce_time: f.time || null, published: true, sort_order: Math.min(0, ...ann.map(x => x.sort_order || 0)) - 1 });
    if (e2) return setMsg(e2.message);
    setF({ title: '', description: '', date: '', time: '', file: null }); e.target.reset(); setMsg('اعلان شائع Done ✔'); load();
  }
  async function toggle(a) { await supabase.from('announcements').update({ published: !a.published }).eq('id', a.id); load(); }
  async function del(a) {
    if (!confirm('Permanently delete this announcement?')) return;
    await supabase.storage.from('announcements').remove([a.image_path]); await supabase.from('announcements').delete().eq('id', a.id); load();
  }
  if (!ready) return <div className="admin-loading"><span className="admin-spinner" /> Loading admin workspace...</div>;
  if (!logged) return (<div className="admin-login-wrap"><form onSubmit={login} className="card admin-login"><h2>Administrator Login</h2>
    <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" autoComplete="username" />
    <input placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} dir="ltr" autoComplete="current-password" />
    {msg && <div className="err">{msg}</div>}<button className="btn">Login</button></form></div>);
  if (!isAdmin) return (<div className="admin-login-wrap"><div className="card admin-login"><div className="err">This account does not have administrator access.</div><button className="btn" onClick={logout}>Logout</button></div></div>);
  const inp = (k, label, type = 'text') => (<><label>{label}</label><input type={type} list={['winner_team', 'loser_team', 'next_a', 'next_b'].includes(k) ? 'tn' : undefined} value={c[k] || ''} onChange={e => set(k, e.target.value)} /></>);
  const tsel = (k, label) => (<><label>{label}</label><select value={c[k] || ''} onChange={e => set(k, e.target.value)}><option value="">— Select a team —</option>{c[k] && !teams.some(x => x.name === c[k]) && <option value={c[k]}>{c[k]}</option>}{teams.map(x => <option key={x.id} value={x.name}>{x.name}</option>)}</select></>);
  const show = (k, l) => (<label><input type="checkbox" checked={c[k] !== '0'} onChange={e => set(k, e.target.checked ? '1' : '0')} style={{ width: 'auto' }} /> {l}</label>);
  const pa = p => supabase.storage.from('announcements').getPublicUrl(p).data.publicUrl;
  return (<div className="admin-shell">
    <aside className="admin-brand"><div className="admin-brand-mark">BJL</div><div><strong>BJL CONTROL</strong><small>SEASON 1 · ADMIN</small></div></aside>
    <header className="admin-topbar"><div><span className="admin-eyebrow">MANAGEMENT CONSOLE</span><h1>BJL Admin Dashboard</h1><p>Manage your tournament, teams, matches and player reviews in one place.</p></div><div className="admin-top-actions"><span className="admin-live"><i /> SYSTEM ONLINE</span><button className="btn admin-logout" onClick={logout}>Logout ↗</button></div></header>
    <datalist id="tn">{teams.map(x => <option key={x.id} value={x.name} />)}</datalist>
    <nav className="tabs admin-tabs" aria-label="Admin sections">
      {[['teams', 'Teams'], ['match', 'Match Center'], ['objections', 'Player Objections'], ['ann', 'Announcements'], ['people', 'Team Photos'], ['moms', 'BJL Moments'], ['quotes', 'Quotes'], ['set', 'Settings']].map(([k, l]) => <button key={k} className={'btn alt' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setMsg(''); }}>{l}</button>)}
      </nav>
    {msg && <div className="good admin-message">{msg}</div>}
    <section className="admin-stats" aria-label="Quick statistics">
      <article className="admin-stat"><span className="admin-stat-icon blue">♧</span><div><small>Total Teams</small><strong>{teams.length}</strong><em>Registered teams</em></div></article>
      <article className="admin-stat"><span className="admin-stat-icon green">✓</span><div><small>Verified Payments</small><strong>{teams.filter(x => x.payment === 'verified').length}</strong><em>Verified payments</em></div></article>
      <article className="admin-stat"><span className="admin-stat-icon amber">◷</span><div><small>Pending Payments</small><strong>{teams.filter(x => x.payment !== 'verified' && x.payment !== 'rejected').length}</strong><em>Awaiting review</em></div></article>
      <article className="admin-stat"><span className="admin-stat-icon violet">▣</span><div><small>Announcements</small><strong>{ann.length}</strong><em>Announcements</em></div></article>
    </section>
    <div className="admin-content-label"><span>WORKSPACE</span><strong>{({teams:'Team Management',match:'Match Center',objections:'Player Objections',ann:'Announcements',people:'Team Photos',moms:'BJL Moments',quotes:'Quotes & Content',set:'Website Settings'})[tab]}</strong></div>
    <main className="admin-workspace">
    {tab === 'match' && (<><div className="card"><h3>Match Result</h3>
      {tsel('winner_team', 'Winning Team')}{tsel('loser_team', 'Opposition Team')}{inp('winner_result', 'Result / Short Note (Optional)')}{inp('winner_date', 'Match Date', 'date')}{show('winner_show', 'Show on Homepage')}
      <button className="btn" onClick={() => save(['winner_team', 'loser_team', 'winner_result', 'winner_date', 'winner_show'])}>Save Changes</button></div>
      <div className="card"><h3>Upcoming Match</h3>
        {tsel('next_a', 'Team A')}{tsel('next_b', 'Team B')}{inp('next_date', 'Date', 'date')}{inp('next_time', 'Time', 'time')}{inp('next_venue', 'Venue (Default: Dab Ground, Battagram)')}{show('next_show', 'Show on Homepage')}
        <button className="btn" onClick={() => save(['next_a', 'next_b', 'next_date', 'next_time', 'next_venue', 'next_show'])}>Save Changes</button></div></>)}
    {tab === 'objections' && (<div className="admin-objections-list">
      <div className="card"><h3>Player Objections Overview</h3><p>{objections.filter(o => o.status === 'open').length} open · {objections.length} total records</p></div>
      {objections.length === 0 && <div className="card">No player objections have been submitted.</div>}
      {objections.map(o => <article className="card admin-objection-card" key={o.id}>
        <div className="admin-objection-head"><div><span className="admin-eyebrow">{o.reason}</span><h3>{o.players?.name || 'Player'} · {o.teams?.name || 'Team'}</h3></div><span className={'admin-objection-status '+o.status}>{o.status.toUpperCase()}</span></div>
        <p>{o.details || 'No description provided.'}</p>
        <small>Raised by <b>{o.raised_by || 'Not provided'}</b> · {new Date(o.created_at).toLocaleString()}</small>
        <div className="row admin-objection-actions"><button className="btn" onClick={() => setObjectionStatus(o,'resolved')} disabled={o.status==='resolved'}>Mark Resolved</button><button className="btn alt" onClick={() => setObjectionStatus(o,'dismissed')} disabled={o.status==='dismissed'}>Dismiss</button><button className="btn alt" onClick={() => setObjectionStatus(o,'open')} disabled={o.status==='open'}>Reopen</button></div>
      </article>)}
    </div>)}
    {tab === 'ann' && (<><form className="card" onSubmit={addAnn}><h3>New Announcement</h3>
      <label>Title</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <label>Description</label><input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
      <label>Date</label><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
      <label>Time</label><input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} />
      <label>Image</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setF({ ...f, file: e.target.files[0] })} />
      <button className="btn">Publish</button></form>
      {ann.map((a, i) => (<div className="card" key={a.id}><b>{a.title}</b> <small>{a.announce_date}</small> {a.published ? '✅' : '⛔'}
        <div className="row" style={{ justifyContent: 'flex-start' }}><button className="btn alt" onClick={() => move(i, -1)}>▲</button><button className="btn alt" onClick={() => move(i, 1)}>▼</button><button className="btn alt" onClick={() => editAnn(a)}>Edit</button><button className="btn alt" onClick={() => toggle(a)}>{a.published ? 'Hide' : 'Show'}</button>
          <button className="btn" onClick={() => del(a)}>Delete Team</button></div></div>))}</>)}
    {tab === 'people' && (<>{[[1, 'AMAN MALIK – MEMBER'], [2, 'WALEED AFRIDI – MEMBER'], [3, 'MUHAMMAD HASNAIN – MEMBER'], [4, 'FALAK – ORGANIZER']].map(([n, l]) => (<div className="card" key={n}><h3>{l}</h3>
      {c['person' + n + '_path'] && <img src={pa(c['person' + n + '_path'])} alt="" width="90" style={{ borderRadius: 8 }} />}
      <p><label>Choose a new image</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadKey('person' + n, e.target.files[0])} /></p></div>))}
      <div className="card"><h3>Arabic Calligraphy Image (Optional)</h3>
        {c.calli_path && <img src={pa(c.calli_path)} alt="" width="200" style={{ borderRadius: 8 }} />}
        <p><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadKey('calli', e.target.files[0])} /></p>
        {c.calli_path && <button className="btn alt" onClick={() => clearKey('calli')}>Remove image (restore default calligraphy)</button>}</div></>)}
    {tab === 'moms' && (<><form className="card" onSubmit={addMoments}><h3>Upload New Photos (5–6 at a time)</h3>
      <label>Date</label><input type="date" value={mf.date} onChange={e => setMf({ ...mf, date: e.target.value })} />
      <label>Caption (Optional)</label><input value={mf.caption} onChange={e => setMf({ ...mf, caption: e.target.value })} />
      <label>Select Images</label><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => setMf({ ...mf, files: e.target.files })} />
      <button className="btn">Publish</button></form>
      {moms.map(m => (<div className="card" key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <img src={pa(m.image_path)} alt="" width="70" height="70" style={{ borderRadius: 8, objectFit: 'cover' }} />
        <div style={{ flex: 1 }}><small>{m.moment_date}</small><div>{m.caption} {m.published ? '✅' : '⛔'}</div>
          <button className="btn alt" onClick={() => capMoment(m)}>Edit Caption</button> <button className="btn alt" onClick={() => togMoment(m)}>{m.published ? 'Hide' : 'Publish'}</button> <button className="btn alt" onClick={() => delMoment(m)}>Delete Team</button></div></div>))}</>)}
    {tab === 'quotes' && (<><form className="card" onSubmit={addQuote}><h3>Add Quote</h3>
      <label>Quote Text</label><textarea rows="4" style={{ width: '100%', padding: 10, borderRadius: 8 }} value={qf.body} onChange={e => setQf({ ...qf, body: e.target.value })} />
      <label>Book</label><input value={qf.book} onChange={e => setQf({ ...qf, book: e.target.value })} />
      <label>Reference</label><input value={qf.ref} onChange={e => setQf({ ...qf, ref: e.target.value })} />
      <button className="btn">Add Quote</button></form>
      {qs.map((x, i) => (<div className="card" key={x.id} dir="rtl"><small>{i + 1}</small> {x.published ? '✅' : '⛔'}<p>{x.body}</p><small>{x.book} · {x.ref}</small>
        <div className="row" style={{ justifyContent: 'flex-start' }}><button className="btn alt" onClick={() => moveQuote(i, -1)}>▲</button><button className="btn alt" onClick={() => moveQuote(i, 1)}>▼</button>
          <button className="btn alt" onClick={() => editQuote(x)}>Edit</button><button className="btn alt" onClick={() => togQuote(x)}>{x.published ? 'Hide' : 'Publish'}</button><button className="btn alt" onClick={() => delQuote(x)}>Delete Team</button></div></div>))}</>)}
    {tab === 'set' && (<div className="card"><h3>WhatsApp Contact Button</h3>
      {inp('falak_whatsapp', 'WhatsApp Number (international format, e.g. 923001234567)')}{inp('falak_btn', 'Button Text')}{inp('falak_msg', 'Default WhatsApp Message')}
      <label><input type="checkbox" style={{ width: 'auto' }} checked={c.registration_open !== 'false'} onChange={e => set('registration_open', e.target.checked ? 'true' : 'false')} /> Team registration is open</label>
      <button className="btn" onClick={() => save(['falak_whatsapp', 'falak_btn', 'falak_msg', 'registration_open'])}>Save Changes</button></div>)}
    {tab === 'teams' && (<><div className="card">Total teams: {teams.length} · Verified payments: {teams.filter(x => x.payment === 'verified').length}</div>
      {teams.map(tm => { const ps = (tm.players || []).slice().sort((a, b) => a.seq - b.seq); const last = (tm.payments || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
        return (<div className="card" key={tm.id}><b>{tm.name}</b> <small>{tm.reg_id}</small> {tm.payment === 'verified' ? '✅ VERIFIED' : '❌ NOT VERIFIED'}
          <div dir="ltr">{tm.captain_email}</div><div dir="ltr">C1: {ps[0] && ps[0].name} {ps[0] && ps[0].mobile} | C2: {ps[1] && ps[1].name} {ps[1] && ps[1].mobile}</div>
          {last && <div dir="ltr">Txn: {last.transaction_id || '-'} <button className="btn alt" onClick={() => shot(last)}>Screenshot</button></div>}
          {tm.payment_rejection_reason && <small>Payment rejection reason: {tm.payment_rejection_reason}</small>}
          <details><summary>View Players</summary>{ps.map(pp => (<div key={pp.id} className="admin-player-row">
            <img src={pub(pp.photo_path)} alt="" width="48" height="48" style={{ borderRadius: 10, objectFit: 'cover' }} />
            <div className="admin-player-main"><div><b>{pp.name}</b> · Age {pp.age} · {pp.position}</div>
              <button type="button" className="btn alt admin-objection-trigger" onClick={() => { setObjectionPlayer(objectionPlayer === pp.id ? null : pp.id); setObjectionDraft({ reason: '', raised_by: '', details: '' }); }}>＋ Raise Objection</button>
              {objectionPlayer === pp.id && <form className="admin-objection-form" onSubmit={e => raiseObjection(e, pp, tm)}>
                <label>Objection Reason</label>
                <select required value={objectionDraft.reason} onChange={e => setObjectionDraft(v => ({ ...v, reason: e.target.value }))}>
                  <option value="">Select a reason</option><option value="Senior Player">Senior Player</option><option value="Over Age">Over Age</option><option value="Community Misconduct">Community Misconduct</option>
                </select>
                <label>Raised By (Name)</label><input required value={objectionDraft.raised_by} onChange={e => setObjectionDraft(v => ({ ...v, raised_by: e.target.value }))} placeholder="Name of the person raising the objection" />
                <label>Description / Evidence</label><textarea required rows="2" value={objectionDraft.details} onChange={e => setObjectionDraft(v => ({ ...v, details: e.target.value }))} placeholder="Write the objection details..." />
                <div className="row"><button className="btn">Submit Objection</button><button type="button" className="btn alt" onClick={() => setObjectionPlayer(null)}>Cancel</button></div>
              </form>}
              {objections.filter(o => o.player_id === pp.id).map(o => <div className="admin-objection-mini" key={o.id}><b>{o.reason}</b> · {o.status.toUpperCase()}<br/><small>Raised by {o.raised_by || 'Not provided'} · {new Date(o.created_at).toLocaleString()}</small><div>{o.details}</div></div>)}
            </div></div>))}</details>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" onClick={() => setPay(tm, 'verified')}>✓ Verify Payment</button>
            <button className="btn alt" onClick={() => setPay(tm, 'notverified')}>Mark Unverified</button>
            <button className="btn alt" onClick={() => setPay(tm, 'rejected')}>Reject Payment</button>
            <button className="btn alt" onClick={() => delTeam(tm)}>Delete Team</button></div></div>); })}</>)}
    </main>
  </div>);
}
