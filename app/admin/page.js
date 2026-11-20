'use client';
import { useEffect, useState } from 'react';
import { adminSupabase as supabase } from '../../lib/adminSupabase';
import { shrink } from '../../lib/img';
const ext = f => (f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg');
const dateFmt = v => { if (!v) return ''; const [y, m, d] = String(v).slice(0, 10).split('-'); return y && m && d ? `${d}/${m}/${y}` : v; };
const okImg = f => f && ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 15 * 1024 * 1024;
export default function Admin() {
  const [ready, setReady] = useState(false); const [isAdmin, setIsAdmin] = useState(false); const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('overview'); const [c, setC] = useState({}); const [ann, setAnn] = useState([]); const [teams, setTeams] = useState([]); const [qs, setQs] = useState([]); const [qf, setQf] = useState({ body: '', book: 'نہج البلاغہ (سید رضیؒ)', ref: '' }); const [moms, setMoms] = useState([]); const [mf, setMf] = useState({ caption: '', date: '', files: [] });
  const [f, setF] = useState({ title: '', description: '', date: '', time: '', file: null });
  const [captainCreds, setCaptainCreds] = useState({});
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
    const { data, error } = await supabase.from('teams').select('*, players:players!players_team_id_fkey(*), payments(*)').order('created_at', { ascending: false });
    if (error) { setMsg('Could not load teams: ' + error.message); return; }
    setTeams(data || []);
  }
  const pub = p => supabase.storage.from('player-photos').getPublicUrl(p).data.publicUrl;
  async function shot(pay) {
    const { data, error } = await supabase.storage.from('payments').createSignedUrl(pay.screenshot_path, 600);
    if (error) return setMsg(error.message); window.open(data.signedUrl, '_blank');
  }
  async function setPay(tm, status) {
    let reason = null;
    if (status === 'rejected') { reason = prompt('مسترد کرنے کی وجہ لکھیں'); if (!reason) return; }
    const last = (tm.payments || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    const val = status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : (last ? 'submitted' : 'pending');
    const { error } = await supabase.from('teams').update({ payment: val, payment_rejection_reason: reason }).eq('id', tm.id);
    if (!error && last) await supabase.from('payments').update({ status: val === 'verified' ? 'verified' : val === 'rejected' ? 'rejected' : 'submitted', rejection_reason: reason }).eq('id', last.id);
    setMsg(error ? error.message : 'ہو گیا ✔'); loadTeams();
  }
  async function setTeamStatus(tm, status) {
    let reason = null;
    if (status === 'rejected') { reason = prompt('Reject Team کرنے کی وجہ لکھیں'); if (!reason) return; }
    const { error } = await supabase.from('teams').update({ status, rejection_reason: reason }).eq('id', tm.id);
    setMsg(error ? error.message : 'Team status saved ✔'); loadTeams();
  }
  async function updateCaptainEmail(tm) {
    const value = prompt('کپتان کی درست Gmail درج کریں:', tm.captain_email || '');
    if (value === null) return;
    const email = value.trim().toLowerCase();
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) return setMsg('درست Gmail درج کریں۔');
    const { error } = await supabase.from('teams').update({ captain_email: email }).eq('id', tm.id);
    setMsg(error ? error.message : 'Captain email saved. You can now create the login account.');
    loadTeams();
  }
  async function createCaptainAccount(tm) {
    const email = (tm.captain_email || '').trim().toLowerCase();
    if (!email) return setMsg('اس ٹیم کا کپتان Gmail ریکارڈ میں موجود نہیں۔');
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = new Uint8Array(14);
    crypto.getRandomValues(bytes);
    const password = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
    setMsg('کپتان کے لیے نیا پاس ورڈ بنایا جا رہا ہے...');
    const { data, error } = await supabase.functions.invoke('captain-login-provisioner', {
      body: { teamId: tm.id, email, password }
    });
    if (error || !data?.ok) return setMsg(error?.message || data?.error || 'اکاؤنٹ نہیں بن سکا۔');
    setCaptainCreds(prev => ({ ...prev, [tm.id]: { email, password } }));
    setMsg('Captain login تیار ہے۔ یہ پاس ورڈ کپتان کو محفوظ طریقے سے دے دیں۔');
  }
  async function copyCaptainCredentials(tm) {
    const cred = captainCreds[tm.id];
    if (!cred) return;
    try {
      await navigator.clipboard.writeText('BJL Team Login\\nGmail: ' + cred.email + '\\nPassword: ' + cred.password);
      setMsg('Gmail اور Password کاپی ہو گئے ✔');
    } catch {
      setMsg('کاپی نہیں ہو سکا، پاس ورڈ کو دستی طور پر کاپی کریں۔');
    }
  }
  async function delTeam(tm) {
    if (!confirm('پوری ٹیم ہمیشہ کے لیے حذف کریں؟')) return;
    const { error } = await supabase.from('teams').delete().eq('id', tm.id); setMsg(error ? error.message : 'ٹیم حذف ہو گئی'); loadTeams();
  }
  useEffect(() => { check(); }, []);
  useEffect(() => { if (isAdmin) { load(); loadTeams(); } }, [isAdmin]);
  async function login(e) {
    e.preventDefault();
    setMsg('');
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== 'musakazim373@gmail.com') return setMsg('This Gmail is not authorized for BJL Admin.');
    const { data: signed, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: pw });
    if (error) return setMsg(error.message);
    const { data: adminRow, error: adminError } = await supabase.from('admins').select('id').eq('id', signed.user.id).maybeSingle();
    if (adminError || !adminRow) { await supabase.auth.signOut(); return setMsg('This account is not the authorized BJL administrator.'); }
    // Revoke all older sessions on other browsers/devices, then create this one fresh session.
    const { error: revokeError } = await supabase.auth.signOut({ scope: 'global' });
    if (revokeError) return setMsg('Could not secure previous sessions. Please try again.');
    const { error: freshError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: pw });
    if (freshError) return setMsg(freshError.message);
    setPw('');
    await check();
  }
  async function logout() { await supabase.auth.signOut({ scope: 'global' }); setLogged(false); setIsAdmin(false); }
  const set = (k, v) => setC(x => ({ ...x, [k]: v }));
  async function save(keys) {
    setMsg('');
    const { error } = await supabase.from('settings').upsert(keys.map(k => ({ key: k, value: c[k] || '' })));
    setMsg(error ? error.message : 'محفوظ ہو گیا ✔');
  }
  async function uploadKey(key, file) {
    setMsg(''); if (!okImg(file)) return setMsg('تصویر JPG/PNG/WEBP ہو۔');
    const path = `site/${key}-${Date.now()}.jpg`; const blob = await shrink(file, 1100);
    const { error } = await supabase.storage.from('announcements').upload(path, blob, { contentType: 'image/jpeg' }); if (error) return setMsg(error.message);
    const { error: e2 } = await supabase.from('settings').upsert({ key: key + '_path', value: path });
    setMsg(e2 ? e2.message : 'تصویر لگ گئی ✔'); load();
  }
  async function clearKey(key) { await supabase.from('settings').upsert({ key: key + '_path', value: '' }); setMsg('ہٹا دی گئی'); load(); }
  async function move(i, d) {
    const arr = ann.slice(); const j = i + d; if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    await Promise.all(arr.map((x, k) => supabase.from('announcements').update({ sort_order: k }).eq('id', x.id))); load();
  }
  async function editAnn(x) {
    const t = prompt('عنوان', x.title); if (t === null) return; const d = prompt('تفصیل', x.description || ''); if (d === null) return;
    await supabase.from('announcements').update({ title: t, description: d }).eq('id', x.id); load();
  }
  async function addMoments(e) {
    e.preventDefault(); setMsg('');
    if (!mf.files.length || !mf.date) return setMsg('تاریخ اور تصاویر ضروری ہیں۔');
    setMsg('اپلوڈ ہو رہا ہے، انتظار کریں...');
    for (const [i, file] of Array.from(mf.files).entries()) {
      if (!okImg(file)) return setMsg('ہر تصویر JPG/PNG/WEBP ہو۔');
      const path = `moments/${Date.now()}-${i}.jpg`; const blob = await shrink(file, 1400);
      const { error } = await supabase.storage.from('announcements').upload(path, blob, { contentType: 'image/jpeg' }); if (error) return setMsg(error.message);
      const { error: e2 } = await supabase.from('moments').insert({ image_path: path, caption: mf.caption, moment_date: mf.date }); if (e2) return setMsg(e2.message);
    }
    setMf({ caption: '', date: '', files: [] }); e.target.reset(); setMsg('تصاویر شائع ہو گئیں ✔'); load();
  }
  async function addQuote(e) {
    e.preventDefault(); if (!qf.body.trim() || !qf.ref.trim()) return setMsg('قول اور حوالہ دونوں ضروری ہیں۔');
    const { error } = await supabase.from('quotes').insert({ body: qf.body.trim(), book: qf.book, ref: qf.ref.trim(), sort_order: qs.length + 1 });
    setMsg(error ? error.message : 'قول شامل ہو گیا ✔'); setQf({ ...qf, body: '', ref: '' }); load();
  }
  async function editQuote(x) {
    const b = prompt('قول (اردو)', x.body); if (b === null) return; const k = prompt('کتاب', x.book); if (k === null) return; const r = prompt('حوالہ', x.ref); if (r === null) return;
    await supabase.from('quotes').update({ body: b, book: k, ref: r }).eq('id', x.id); load();
  }
  async function togQuote(x) { await supabase.from('quotes').update({ published: !x.published }).eq('id', x.id); load(); }
  async function delQuote(x) { if (!confirm('قول حذف کریں؟')) return; await supabase.from('quotes').delete().eq('id', x.id); load(); }
  async function moveQuote(i, d) {
    const arr = qs.slice(); const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]];
    await Promise.all(arr.map((x, k) => supabase.from('quotes').update({ sort_order: k + 1 }).eq('id', x.id))); load();
  }
  async function delMoment(m) { if (!confirm('تصویر حذف کریں؟')) return; await supabase.storage.from('announcements').remove([m.image_path]); await supabase.from('moments').delete().eq('id', m.id); load(); }
  async function togMoment(m) { await supabase.from('moments').update({ published: !m.published }).eq('id', m.id); load(); }
  async function capMoment(m) { const v = prompt('کیپشن', m.caption || ''); if (v === null) return; await supabase.from('moments').update({ caption: v }).eq('id', m.id); load(); }
  async function addAnn(e) {
    e.preventDefault(); setMsg('');
    if (!f.title.trim() || !f.date || !okImg(f.file)) return setMsg('عنوان، تاریخ اور تصویر (JPG/PNG، 3MB تک) ضروری ہیں۔');
    const path = `ann/${Date.now()}.jpg`; const blob = await shrink(f.file, 1400);
    const { error } = await supabase.storage.from('announcements').upload(path, blob, { contentType: 'image/jpeg' }); if (error) return setMsg(error.message);
    const { error: e2 } = await supabase.from('announcements').insert({ title: f.title.trim(), description: f.description, image_path: path, announce_date: f.date, announce_time: f.time || null, published: true, sort_order: Math.min(0, ...ann.map(x => x.sort_order || 0)) - 1 });
    if (e2) return setMsg(e2.message);
    setF({ title: '', description: '', date: '', time: '', file: null }); e.target.reset(); setMsg('اعلان شائع ہو گیا ✔'); load();
  }
  async function toggle(a) { await supabase.from('announcements').update({ published: !a.published }).eq('id', a.id); load(); }
  async function del(a) {
    if (!confirm('یہ اعلان ہمیشہ کے لیے حذف کریں؟')) return;
    await supabase.storage.from('announcements').remove([a.image_path]); await supabase.from('announcements').delete().eq('id', a.id); load();
  }
  if (!ready) return <p>...</p>;
  if (!logged) return (<form onSubmit={login} className="card"><h2>Admin Login</h2>
    <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} />
    <input placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} dir="ltr" autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
    <p><a href="/reset-password?role=admin" className="tlink">Forgot Password?</a></p>
    {msg && <div className="err">{msg}</div>}<button className="btn">Login</button></form>);
  if (!isAdmin) return (<div className="card"><div className="err">You are not an administrator.</div><button className="btn" onClick={logout}>Logout</button></div>);
  const inp = (k, label, type = 'text') => (<><label>{label}</label><input type={type} list={['winner_team', 'loser_team', 'next_a', 'next_b'].includes(k) ? 'tn' : undefined} value={c[k] || ''} onChange={e => set(k, e.target.value)} /></>);
  const tsel = (k, label) => (<><label>{label}</label><select value={c[k] || ''} onChange={e => set(k, e.target.value)}><option value="">— ٹیم منتخب کریں —</option>{c[k] && !teams.some(x => x.name === c[k]) && <option value={c[k]}>{c[k]}</option>}{teams.map(x => <option key={x.id} value={x.name}>{x.name}</option>)}</select></>);
  const show = (k, l) => (<label><input type="checkbox" checked={c[k] !== '0'} onChange={e => set(k, e.target.checked ? '1' : '0')} style={{ width: 'auto' }} /> {l}</label>);
  const pa = p => supabase.storage.from('announcements').getPublicUrl(p).data.publicUrl;
  return (<div>
    <h2>BJL Admin</h2>
    <datalist id="tn">{teams.map(x => <option key={x.id} value={x.name} />)}</datalist>
    <div className="tabs">
      {[['overview', 'Overview'], ['teams', 'Teams'], ['match', 'Matches & Results'], ['ann', 'Announcements'], ['people', 'Team Photos'], ['moms', 'BJL Moments'], ['quotes', 'Quotes'], ['set', 'Settings']].map(([k, l]) => <button key={k} className={'btn alt' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setMsg(''); }}>{l}</button>)}
      <button className="btn" onClick={logout}>Logout</button></div>
    {msg && <div className="good">{msg}</div>}
    {tab === 'overview' && (<>
      <div className="card"><h3>Dashboard Overview</h3><p>Season 1 tournament summary</p>
        <div className="two">
          <div className="card"><b>کل ٹیمیں</b><div className="big">{teams.length}</div></div>
          <div className="card"><b>Approve Team شدہ</b><div className="big">{teams.filter(x => x.status === 'approved').length}</div></div>
          <div className="card"><b>ادائیگی تصدیق شدہ</b><div className="big">{teams.filter(x => x.payment === 'verified').length}</div></div>
          <div className="card"><b>Mark Payment Pending</b><div className="big">{teams.filter(x => x.payment === 'submitted').length}</div></div>
          <div className="card"><b>کل کھلاڑی</b><div className="big">{teams.reduce((n, x) => n + (x.players || []).length, 0)}</div></div>
          <div className="card"><b>اعلانات</b><div className="big">{ann.length}</div></div>
        </div>
      </div>
      <div className="card"><h3>Quick Actions</h3><div className="row" style={{justifyContent:'flex-start'}}>
        <button className="btn" onClick={() => setTab('teams')}>Teams & Payments</button>
        <button className="btn alt" onClick={() => setTab('match')}>Matches & Results</button>
        <button className="btn alt" onClick={() => setTab('ann')}>Announcements & Photos</button>
        <button className="btn alt" onClick={() => setTab('set')}>Website Settings</button>
      </div></div>
    </>)}
    {tab === 'match' && (<><div className="card"><h3>Today's Winner</h3>
      {tsel('winner_team', 'Winning Team')}{tsel('loser_team', 'Opponent Team')}{inp('winner_result', 'Text below winner photo (result / short details)')}{inp('winner_date', 'Match Date', 'date')}{show('winner_show', 'Show on Homepage')}
      <label>Winner / Team Photo</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadKey('winner_photo', e.target.files[0])} />{c.winner_photo_path && <img className="match-photo" src={pa(c.winner_photo_path)} alt="Winning team" />}<button className="btn" onClick={() => save(['winner_team', 'loser_team', 'winner_result', 'winner_date', 'winner_show'])}>Save Winner</button></div>
      <div className="card"><h3>Next Match</h3>
        {tsel('next_a', 'Team A')}{tsel('next_b', 'Team B')}{inp('next_date', 'Match Date', 'date')}{inp('next_time', 'Match Time', 'time')}{inp('next_venue', 'Venue (default: Dab Ground, Battagram)')}<div className="two"><div><label>Team A Captain Photo</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadKey('next_a_photo', e.target.files[0])} />{c.next_a_photo_path && <img className="match-photo" src={pa(c.next_a_photo_path)} alt="Team A captain" />}</div><div><label>Team B Captain Photo</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadKey('next_b_photo', e.target.files[0])} />{c.next_b_photo_path && <img className="match-photo" src={pa(c.next_b_photo_path)} alt="Team B captain" />}</div></div>{show('next_show', 'Show on Homepage')}
        <button className="btn" onClick={() => save(['next_a', 'next_b', 'next_date', 'next_time', 'next_venue', 'next_show'])}>Save Next Match</button></div></>)}
    {tab === 'ann' && (<><form className="card" onSubmit={addAnn}><h3>New Announcement</h3>
      <label>Title</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <label>Description</label><input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
      <label>Date</label><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
      <label>Time</label><input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} />
      <label>Image</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setF({ ...f, file: e.target.files[0] })} />
      <button className="btn">Publish</button></form>
      {ann.map((a, i) => (<div className="card" key={a.id}><b>{a.title}</b> <small>{dateFmt(a.announce_date)}</small> {a.published ? '✅' : '⛔'}
        <div className="row" style={{ justifyContent: 'flex-start' }}><button className="btn alt" onClick={() => move(i, -1)}>▲</button><button className="btn alt" onClick={() => move(i, 1)}>▼</button><button className="btn alt" onClick={() => editAnn(a)}>ایڈٹ</button><button className="btn alt" onClick={() => toggle(a)}>{a.published ? 'چھپائیں' : 'دکھائیں'}</button>
          <button className="btn" onClick={() => del(a)}>Delete</button></div></div>))}</>)}
    {tab === 'people' && (<>{[[1, 'AMAN MALIK – MEMBER'], [2, 'WALEED AFRIDI – MEMBER'], [3, 'MUHAMMAD HASNAIN – MEMBER'], [4, 'FALAK – ORGANIZER']].map(([n, l]) => (<div className="card" key={n}><h3>{l}</h3>
      {c['person' + n + '_path'] && <img src={pa(c['person' + n + '_path'])} alt="" width="90" style={{ borderRadius: 8 }} />}
      <p><label>Choose New Photo</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadKey('person' + n, e.target.files[0])} /></p></div>))}
      <div className="card"><h3>Calligraphy Image (Optional)</h3>
        {c.calli_path && <img src={pa(c.calli_path)} alt="" width="200" style={{ borderRadius: 8 }} />}
        <p><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadKey('calli', e.target.files[0])} /></p>
        {c.calli_path && <button className="btn alt" onClick={() => clearKey('calli')}>تصویر ہٹائیں (سادہ خطاطی واپس)</button>}</div></>)}
    {tab === 'moms' && (<><form className="card" onSubmit={addMoments}><h3>نئی تصاویر (5-6 ایک ساتھ)</h3>
      <label>Date</label><input type="date" value={mf.date} onChange={e => setMf({ ...mf, date: e.target.value })} />
      <label>Caption (Optional)</label><input value={mf.caption} onChange={e => setMf({ ...mf, caption: e.target.value })} />
      <label>Choose Photos</label><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => setMf({ ...mf, files: e.target.files })} />
      <button className="btn">Publish</button></form>
      {moms.map(m => (<div className="card" key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <img src={pa(m.image_path)} alt="" width="70" height="70" style={{ borderRadius: 8, objectFit: 'cover' }} />
        <div style={{ flex: 1 }}><small>{dateFmt(m.moment_date)}</small><div>{m.caption} {m.published ? '✅' : '⛔'}</div>
          <button className="btn alt" onClick={() => capMoment(m)}>کیپشن</button> <button className="btn alt" onClick={() => togMoment(m)}>{m.published ? 'چھپائیں' : 'دکھائیں'}</button> <button className="btn alt" onClick={() => delMoment(m)}>Delete</button></div></div>))}</>)}
    {tab === 'quotes' && (<><form className="card" onSubmit={addQuote}><h3>New Quote</h3>
      <label>Quote Text</label><textarea rows="4" style={{ width: '100%', padding: 10, borderRadius: 8 }} value={qf.body} onChange={e => setQf({ ...qf, body: e.target.value })} />
      <label>Book</label><input value={qf.book} onChange={e => setQf({ ...qf, book: e.target.value })} />
      <label>Reference</label><input value={qf.ref} onChange={e => setQf({ ...qf, ref: e.target.value })} />
      <button className="btn">Add Quote</button></form>
      {qs.map((x, i) => (<div className="card" key={x.id} dir="rtl"><small>{i + 1}</small> {x.published ? '✅' : '⛔'}<p>{x.body}</p><small>{x.book} · {x.ref}</small>
        <div className="row" style={{ justifyContent: 'flex-start' }}><button className="btn alt" onClick={() => moveQuote(i, -1)}>▲</button><button className="btn alt" onClick={() => moveQuote(i, 1)}>▼</button>
          <button className="btn alt" onClick={() => editQuote(x)}>ایڈٹ</button><button className="btn alt" onClick={() => togQuote(x)}>{x.published ? 'چھپائیں' : 'دکھائیں'}</button><button className="btn alt" onClick={() => delQuote(x)}>Delete</button></div></div>))}</>)}
    {tab === 'set' && (<div className="card"><h3>WhatsApp & Website Settings</h3>
      {inp('falak_whatsapp', 'WhatsApp Contact Number (international format, e.g. 923165738591)')}{inp('falak_btn', 'Floating WhatsApp Button Text')}{inp('falak_msg', 'Default WhatsApp Message')}
      <label>Official WhatsApp Group Invite Link</label><input value={c.official_whatsapp_group || 'https://chat.whatsapp.com/D5RUqQB6XVIIwHkYJkz5vZ'} onChange={e => set('official_whatsapp_group', e.target.value)} dir="ltr" />
      <label>Group Information Message</label><input value={c.official_group_text || 'All BJL Season 1 updates, schedules, results and announcements are available in the official WhatsApp group.'} onChange={e => set('official_group_text', e.target.value)} />
      <label><input type="checkbox" style={{ width: 'auto' }} checked={c.registration_open !== 'false'} onChange={e => set('registration_open', e.target.checked ? 'true' : 'false')} /> نئی ٹیموں کی رجسٹریشن کھلی ہے</label>
      <button className="btn" onClick={() => save(['falak_whatsapp', 'falak_btn', 'falak_msg', 'official_whatsapp_group', 'official_group_text', 'registration_open'])}>Save Settings</button></div>)}
    {tab === 'teams' && (<><div className="card">Total Teams: {teams.length} · Verified: {teams.filter(x => x.payment === 'verified').length}</div>
      {teams.map(tm => { const ps = (tm.players || []).slice().sort((a, b) => a.seq - b.seq); const last = (tm.payments || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
        return (<div className="card" key={tm.id}><b>{tm.name}</b> <small>{tm.reg_id}</small>
          <div>Team: <span className={'badge ' + (tm.status === 'approved' ? 'v' : 'n')}>{tm.status || 'pending'}</span> · Payment: <span className={'badge ' + (tm.payment === 'verified' ? 'v' : 'n')}>{tm.payment || 'pending'}</span></div>
          <div dir="ltr">Captain Gmail: {tm.captain_email || 'Not added yet'}</div>
          <button className="btn alt" onClick={() => updateCaptainEmail(tm)}>Add / Edit Captain Email</button>
          <div dir="ltr">C1: {ps[0] && ps[0].name} {ps[0] && ps[0].mobile} | C2: {ps[1] && ps[1].name} {ps[1] && ps[1].mobile}</div>
          {last && <div dir="ltr">Txn: {last.transaction_id || '-'} <button className="btn alt" onClick={() => shot(last)}>Screenshot</button></div>}
          {tm.payment_rejection_reason && <small>رد کرنے کی وجہ: {tm.payment_rejection_reason}</small>}
          <details><summary>15 کھلاڑی</summary>{ps.map(pp => (<div key={pp.id} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0' }}>
            <img src={pub(pp.photo_path)} alt="" width="48" height="48" style={{ borderRadius: 8, objectFit: 'cover' }} />{pp.name} · {pp.age} · {pp.position}</div>))}</details>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" onClick={() => setTeamStatus(tm, 'approved')}>✓ Approve Team</button>
            <button className="btn alt" onClick={() => setTeamStatus(tm, 'rejected')}>Reject Team</button>
            <button className="btn alt" onClick={() => createCaptainAccount(tm)}>{captainCreds[tm.id] ? 'Generate New Password' : 'Generate Captain Password'}</button>
            {captainCreds[tm.id] && <div className="good" style={{ width: '100%', textAlign: 'left' }} dir="ltr">
              <b>Captain Login Details</b><div>Gmail: {captainCreds[tm.id].email}</div>
              <div>Password: <strong>{captainCreds[tm.id].password}</strong></div>
              <button className="btn alt" onClick={() => copyCaptainCredentials(tm)}>Copy Gmail + Password</button>
            </div>}
            <button className="btn" onClick={() => setPay(tm, 'verified')}>✓ Verify Payment</button>
            <button className="btn alt" onClick={() => setPay(tm, 'notverified')}>Mark Payment Pending</button>
            <button className="btn alt" onClick={() => setPay(tm, 'rejected')}>مسترد</button>
            <button className="btn alt" onClick={() => delTeam(tm)}>Delete</button></div></div>); })}</>)}
  </div>);
}
