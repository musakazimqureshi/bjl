'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { shrink } from '../../lib/img';
const ext = f => (f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg');
const okImg = f => f && ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 15 * 1024 * 1024;
export default function Admin() {
  const [ready, setReady] = useState(false); const [isAdmin, setIsAdmin] = useState(false); const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('overview'); const [c, setC] = useState({}); const [ann, setAnn] = useState([]); const [teams, setTeams] = useState([]); const [qs, setQs] = useState([]); const [qf, setQf] = useState({ body: '', book: 'نہج البلاغہ (سید رضیؒ)', ref: '' }); const [moms, setMoms] = useState([]); const [mf, setMf] = useState({ caption: '', date: '', files: [] });
  const [f, setF] = useState({ title: '', description: '', date: '', time: '', file: null });
  const [objs, setObjs] = useState([]); const [of, setOf] = useState(null); const [tf, setTf] = useState('all'); const [tq, setTq] = useState('');
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
      setMsg(error?.message || 'لاگ اِن چیک نہیں ہو سکا۔');
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
    if (error) { setMsg('ٹیموں کا ریکارڈ لوڈ نہیں ہوا: ' + error.message); return; }
    setTeams(data || []);
  }
  async function loadObjs() {
    const { data, error } = await supabase.from('player_objections').select('*').order('created_at', { ascending: false });
    if (error) { setMsg('اعتراضات لوڈ نہیں ہوئے: ' + error.message); return; }
    setObjs(data || []);
  }
  async function addObjection(e) {
    e.preventDefault();
    if (!of || !of.reason.trim()) return setMsg('اعتراض کی وجہ لکھنا ضروری ہے۔');
    const { error } = await supabase.from('player_objections').insert({ player_id: of.player_id, team_id: of.team_id, reason: of.reason.trim(), details: of.details.trim() || null, raised_by: of.raised_by.trim() || null });
    if (error) return setMsg(error.message);
    setOf(null); setMsg('اعتراض درج ہو گیا ✔'); loadObjs();
  }
  async function setObj(o, status) {
    let note = o.admin_note || null;
    if (status !== 'open') { const v = prompt('ایڈمن نوٹ (اختیاری)', o.admin_note || ''); if (v === null) return; note = v.trim() || null; }
    const { error } = await supabase.from('player_objections').update({ status, admin_note: note, resolved_at: status === 'open' ? null : new Date().toISOString() }).eq('id', o.id);
    setMsg(error ? error.message : 'اعتراض کی حالت محفوظ ہو گئی ✔'); loadObjs();
  }
  async function delObj(o) {
    if (!confirm('یہ اعتراض ہمیشہ کے لیے حذف کریں؟')) return;
    const { error } = await supabase.from('player_objections').delete().eq('id', o.id);
    setMsg(error ? error.message : 'اعتراض حذف ہو گیا'); loadObjs();
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
    if (status === 'rejected') { reason = prompt('ٹیم مسترد کرنے کی وجہ لکھیں'); if (!reason) return; }
    const { error } = await supabase.from('teams').update({ status, rejection_reason: reason }).eq('id', tm.id);
    setMsg(error ? error.message : 'ٹیم کی تصدیق کی حالت محفوظ ہو گئی ✔'); loadTeams();
  }
  async function updateCaptainEmail(tm) {
    const value = prompt('کپتان کی درست Gmail درج کریں:', tm.captain_email || '');
    if (value === null) return;
    const email = value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setMsg('درست Gmail درج کریں۔');
    const { error } = await supabase.from('teams').update({ captain_email: email }).eq('id', tm.id);
    setMsg(error ? error.message : 'کپتان کی Gmail محفوظ ہو گئی۔ اب لاگ اِن اکاؤنٹ بنائیں۔');
    loadTeams();
  }
  async function createCaptainAccount(tm) {
    const email = (tm.captain_email || '').trim().toLowerCase();
    if (!email) return setMsg('اس ٹیم کا کپتان Gmail ریکارڈ میں موجود نہیں۔');
    const password = prompt('کپتان کے لیے ابتدائی پاس ورڈ بنائیں (کم از کم 8 حروف یا نمبرز):');
    if (!password) return;
    if (password.length < 8) return setMsg('ابتدائی پاس ورڈ کم از کم 8 حروف یا نمبرز کا ہونا چاہیے۔');
    const confirmPassword = prompt('ابتدائی پاس ورڈ دوبارہ درج کریں:');
    if (password !== confirmPassword) return setMsg('دونوں پاس ورڈ ایک جیسے نہیں ہیں۔');
    setMsg('کپتان کا اکاؤنٹ بنایا جا رہا ہے...');
    const { data, error } = await supabase.functions.invoke('create-captain-account', {
      body: { teamId: tm.id, email, password }
    });
    setMsg(error ? (error.message || 'اکاؤنٹ نہیں بن سکا۔') : (data?.message || 'کپتان کا اکاؤنٹ بن گیا۔'));
  }
  async function delTeam(tm) {
    if (!confirm('پوری ٹیم ہمیشہ کے لیے حذف کریں؟')) return;
    const { error } = await supabase.from('teams').delete().eq('id', tm.id); setMsg(error ? error.message : 'ٹیم حذف ہو گئی'); loadTeams();
  }
  useEffect(() => { check(); }, []);
  useEffect(() => { if (isAdmin) { load(); loadTeams(); loadObjs(); } }, [isAdmin]);
  async function login(e) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
    if (error) return setMsg(error.message);
    setPw('');
    await check();
  }
  async function logout() { await supabase.auth.signOut(); setLogged(false); setIsAdmin(false); }
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
  if (!isAdmin) return (<div className="card"><div className="err">آپ ایڈمن نہیں ہیں۔</div><button className="btn" onClick={logout}>Logout</button></div>);
  const inp = (k, label, type = 'text') => (<><label>{label}</label><input type={type} list={['winner_team', 'loser_team', 'next_a', 'next_b'].includes(k) ? 'tn' : undefined} value={c[k] || ''} onChange={e => set(k, e.target.value)} /></>);
  const tsel = (k, label) => (<><label>{label}</label><select value={c[k] || ''} onChange={e => set(k, e.target.value)}><option value="">— ٹیم منتخب کریں —</option>{c[k] && !teams.some(x => x.name === c[k]) && <option value={c[k]}>{c[k]}</option>}{teams.map(x => <option key={x.id} value={x.name}>{x.name}</option>)}</select></>);
  const show = (k, l) => (<label><input type="checkbox" checked={c[k] !== '0'} onChange={e => set(k, e.target.checked ? '1' : '0')} style={{ width: 'auto' }} /> {l}</label>);
  const pa = p => supabase.storage.from('announcements').getPublicUrl(p).data.publicUrl;
  const area = (k, label) => (<><label>{label}</label><textarea className="ta" rows="3" value={c[k] || ''} onChange={e => set(k, e.target.value)} /></>);
  const photo = (key, label) => (<div style={{ margin: '8px 0' }}><label>{label}</label>
    {c[key + '_path'] && <img className="thumb" src={pa(c[key + '_path'])} alt="" />}
    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const fl = e.target.files[0]; e.target.value = ''; if (fl) uploadKey(key, fl); }} />
    {c[key + '_path'] && <button className="btn alt" type="button" onClick={() => clearKey(key)}>تصویر ہٹائیں</button>}</div>);
  return (<div>
    <h2>BJL Admin</h2>
    <datalist id="tn">{teams.map(x => <option key={x.id} value={x.name} />)}</datalist>
    <div className="tabs">
      {[['overview', 'Overview'], ['teams', 'ٹیمیں'], ['obj', 'اعتراضات'], ['match', 'میچ سینٹر'], ['ann', 'اعلانات'], ['people', 'ٹیم تصاویر'], ['moms', 'BJL Moments'], ['quotes', 'اقوال'], ['set', 'سیٹنگ']].map(([k, l]) => <button key={k} className={'btn alt' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setMsg(''); }}>{l}</button>)}
      <button className="btn" onClick={logout}>Logout</button></div>
    {msg && <div className="good">{msg}</div>}
    {tab === 'overview' && (<>
      <div className="card"><h3>Dashboard Overview</h3><p>آپ کے ٹورنامنٹ کا مکمل خلاصہ</p>
        <div className="two">
          <div className="card"><b>کل ٹیمیں</b><div className="big">{teams.length}</div></div>
          <div className="card"><b>ٹیم منظور شدہ</b><div className="big">{teams.filter(x => x.status === 'approved').length}</div></div>
          <div className="card"><b>ادائیگی تصدیق شدہ</b><div className="big">{teams.filter(x => x.payment === 'verified').length}</div></div>
          <div className="card"><b>ادائیگی زیرِ تصدیق</b><div className="big">{teams.filter(x => x.payment === 'submitted').length}</div></div>
          <div className="card"><b>کل کھلاڑی</b><div className="big">{teams.reduce((n, x) => n + (x.players || []).length, 0)}</div></div>
          <div className="card"><b>اعلانات</b><div className="big">{ann.length}</div></div>
          <div className="card"><b>BJL Moments</b><div className="big">{moms.length}</div></div>
          <div className="card"><b>کھلے اعتراضات</b><div className="big">{objs.filter(x => x.status === 'open').length}</div></div>
        </div>
      </div>
      <div className="card"><h3>فوری رسائی</h3><div className="row" style={{justifyContent:'flex-start'}}>
        <button className="btn" onClick={() => setTab('teams')}>ٹیمیں اور ادائیگیاں</button>
        <button className="btn alt" onClick={() => setTab('match')}>میچ اور نتائج</button>
        <button className="btn alt" onClick={() => setTab('ann')}>اعلانات اور تصاویر</button>
        <button className="btn alt" onClick={() => setTab('set')}>ویب سائٹ سیٹنگز</button>
      </div></div>
    </>)}
    {tab === 'match' && (<><div className="card"><h3>آج کا فاتح</h3>
      {tsel('winner_team', 'جیتنے والی ٹیم')}{tsel('loser_team', 'مخالف (ہارنے والی) ٹیم')}{inp('winner_result', 'نتیجہ / مختصر اعلان (اختیاری)')}{area('winner_text', 'تفصیلی تحریر (تصویر پر کلک کرنے پر بھی نظر آئے گی)')}{inp('winner_date', 'میچ کی تاریخ', 'date')}{photo('winner_img', 'فاتح کی تصویر (کلک پر بڑی ہو جائے گی)')}{show('winner_show', 'ہوم پیج پر دکھائیں')}
      <button className="btn" onClick={() => save(['winner_team', 'loser_team', 'winner_result', 'winner_text', 'winner_date', 'winner_show'])}>محفوظ کریں</button></div>
      <div className="card"><h3>اگلا میچ</h3>
        {tsel('next_a', 'ٹیم A')}{tsel('next_b', 'ٹیم B')}{inp('next_date', 'تاریخ', 'date')}{inp('next_time', 'وقت', 'time')}{inp('next_venue', 'مقام (خالی ہو تو: Dab Ground, Battagram)')}{area('next_text', 'تفصیلی تحریر (تصویر پر کلک کرنے پر بھی نظر آئے گی)')}{photo('next_img', 'اگلے میچ کی تصویر (کلک پر بڑی ہو جائے گی)')}{show('next_show', 'ہوم پیج پر دکھائیں')}
        <button className="btn" onClick={() => save(['next_a', 'next_b', 'next_date', 'next_time', 'next_venue', 'next_text', 'next_show'])}>محفوظ کریں</button></div></>)}
    {tab === 'ann' && (<><form className="card" onSubmit={addAnn}><h3>نیا اعلان</h3>
      <label>عنوان</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <label>تفصیل</label><input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
      <label>تاریخ</label><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
      <label>وقت</label><input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} />
      <label>تصویر</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setF({ ...f, file: e.target.files[0] })} />
      <button className="btn">شائع کریں</button></form>
      {ann.map((a, i) => (<div className="card" key={a.id}><b>{a.title}</b> <small>{a.announce_date}</small> {a.published ? '✅' : '⛔'}
        <div className="row" style={{ justifyContent: 'flex-start' }}><button className="btn alt" onClick={() => move(i, -1)}>▲</button><button className="btn alt" onClick={() => move(i, 1)}>▼</button><button className="btn alt" onClick={() => editAnn(a)}>ایڈٹ</button><button className="btn alt" onClick={() => toggle(a)}>{a.published ? 'چھپائیں' : 'دکھائیں'}</button>
          <button className="btn" onClick={() => del(a)}>حذف</button></div></div>))}</>)}
    {tab === 'people' && (<>{[[4, 'FALAK', 'ORGANIZER'], [1, 'AMAN MALIK', 'MEMBER'], [2, 'WALEED AFRIDI', 'MEMBER'], [3, 'MUHAMMAD HASNAIN', 'MEMBER']].map(([n, nm, rl]) => (<div className="card" key={n}><h3>{c['person' + n + '_name'] || nm} – {c['person' + n + '_role'] || rl}</h3>
      {c['person' + n + '_path'] && <img src={pa(c['person' + n + '_path'])} alt="" width="90" style={{ borderRadius: 8 }} />}
      {inp('person' + n + '_name', 'نام (خالی ہو تو: ' + nm + ')')}{inp('person' + n + '_role', 'عہدہ (خالی ہو تو: ' + rl + ')')}
      <button className="btn" onClick={() => save(['person' + n + '_name', 'person' + n + '_role'])}>نام / عہدہ محفوظ کریں</button>
      <p><label>نئی تصویر چنیں</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const fl = e.target.files[0]; e.target.value = ''; if (fl) uploadKey('person' + n, fl); }} /></p></div>))}
      <div className="card"><h3>عربی خطاطی کی تصویر (اختیاری)</h3>
        {c.calli_path && <img src={pa(c.calli_path)} alt="" width="200" style={{ borderRadius: 8 }} />}
        <p><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadKey('calli', e.target.files[0])} /></p>
        {c.calli_path && <button className="btn alt" onClick={() => clearKey('calli')}>تصویر ہٹائیں (سادہ خطاطی واپس)</button>}</div></>)}
    {tab === 'moms' && (<><form className="card" onSubmit={addMoments}><h3>نئی تصاویر (5-6 ایک ساتھ)</h3>
      <label>تاریخ</label><input type="date" value={mf.date} onChange={e => setMf({ ...mf, date: e.target.value })} />
      <label>کیپشن (اختیاری)</label><input value={mf.caption} onChange={e => setMf({ ...mf, caption: e.target.value })} />
      <label>تصاویر چنیں</label><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => setMf({ ...mf, files: e.target.files })} />
      <button className="btn">شائع کریں</button></form>
      {moms.map(m => (<div className="card" key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <img src={pa(m.image_path)} alt="" width="70" height="70" style={{ borderRadius: 8, objectFit: 'cover' }} />
        <div style={{ flex: 1 }}><small>{m.moment_date}</small><div>{m.caption} {m.published ? '✅' : '⛔'}</div>
          <button className="btn alt" onClick={() => capMoment(m)}>کیپشن</button> <button className="btn alt" onClick={() => togMoment(m)}>{m.published ? 'چھپائیں' : 'دکھائیں'}</button> <button className="btn alt" onClick={() => delMoment(m)}>حذف</button></div></div>))}</>)}
    {tab === 'quotes' && (<><form className="card" onSubmit={addQuote}><h3>نیا قول</h3>
      <label>اردو ترجمہ</label><textarea rows="4" style={{ width: '100%', padding: 10, borderRadius: 8 }} value={qf.body} onChange={e => setQf({ ...qf, body: e.target.value })} />
      <label>کتاب</label><input value={qf.book} onChange={e => setQf({ ...qf, book: e.target.value })} />
      <label>حوالہ (نمبر)</label><input value={qf.ref} onChange={e => setQf({ ...qf, ref: e.target.value })} />
      <button className="btn">شامل کریں</button></form>
      {qs.map((x, i) => (<div className="card" key={x.id} dir="rtl"><small>{i + 1}</small> {x.published ? '✅' : '⛔'}<p>{x.body}</p><small>{x.book} · {x.ref}</small>
        <div className="row" style={{ justifyContent: 'flex-start' }}><button className="btn alt" onClick={() => moveQuote(i, -1)}>▲</button><button className="btn alt" onClick={() => moveQuote(i, 1)}>▼</button>
          <button className="btn alt" onClick={() => editQuote(x)}>ایڈٹ</button><button className="btn alt" onClick={() => togQuote(x)}>{x.published ? 'چھپائیں' : 'دکھائیں'}</button><button className="btn alt" onClick={() => delQuote(x)}>حذف</button></div></div>))}</>)}
    {tab === 'set' && (<div className="card"><h3>Ask Falak بٹن</h3>
      {inp('falak_whatsapp', 'WhatsApp نمبر (بین الاقوامی، مثلاً 923411620498)')}{inp('falak_btn', 'بٹن کا متن')}{inp('falak_msg', 'ڈیفالٹ پیغام (WhatsApp میں پہلے سے لکھا آئے گا)')}
      <label><input type="checkbox" style={{ width: 'auto' }} checked={c.registration_open !== 'false'} onChange={e => set('registration_open', e.target.checked ? 'true' : 'false')} /> نئی ٹیموں کی رجسٹریشن کھلی ہے</label>
      <button className="btn" onClick={() => save(['falak_whatsapp', 'falak_btn', 'falak_msg', 'registration_open'])}>محفوظ کریں</button></div>)}
    {tab === 'teams' && (<><div className="card">کل ٹیمیں: {teams.length} · منظور: {teams.filter(x => x.status === 'approved').length} · ادائیگی تصدیق شدہ: {teams.filter(x => x.payment === 'verified').length}
        <div className="row" style={{ justifyContent: 'flex-start' }}>{[['all', 'تمام'], ['pending', 'ٹیم زیرِ غور'], ['approved', 'منظور'], ['rejected', 'مسترد'], ['paywait', 'ادائیگی تصدیق طلب'], ['payok', 'ادائیگی تصدیق شدہ'], ['obj', 'اعتراض والی']].map(([k, l]) => <button key={k} className={'btn alt' + (tf === k ? ' on' : '')} onClick={() => setTf(k)}>{l}</button>)}</div>
        <input placeholder="ٹیم کا نام / Reg ID / کھلاڑی کا نام تلاش کریں" value={tq} onChange={e => setTq(e.target.value)} /></div>
      {teams.filter(tm => {
        const q = tq.trim().toLowerCase();
        if (q && !((tm.name || '').toLowerCase().includes(q) || (tm.reg_id || '').toLowerCase().includes(q) || (tm.players || []).some(pp => (pp.name || '').toLowerCase().includes(q)))) return false;
        if (tf === 'pending') return (tm.status || 'pending') === 'pending';
        if (tf === 'approved') return tm.status === 'approved';
        if (tf === 'rejected') return tm.status === 'rejected';
        if (tf === 'paywait') return tm.payment === 'submitted';
        if (tf === 'payok') return tm.payment === 'verified';
        if (tf === 'obj') return objs.some(o => o.team_id === tm.id && o.status === 'open');
        return true;
      }).map(tm => { const ps = (tm.players || []).slice().sort((a, b) => a.seq - b.seq); const last = (tm.payments || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
        const tobj = objs.filter(o => o.team_id === tm.id); const open = tobj.filter(o => o.status === 'open').length;
        return (<div className="card" key={tm.id}><b>{tm.name}</b> <small>{tm.reg_id}</small>
          <div>Team: <span className={'badge ' + (tm.status === 'approved' ? 'v' : 'n')}>{tm.status || 'pending'}</span> · Payment: <span className={'badge ' + (tm.payment === 'verified' ? 'v' : 'n')}>{tm.payment || 'pending'}</span>{open > 0 && <> · <span className="badge n">⚠ {open} اعتراض</span></>}</div>
          {tm.status === 'rejected' && tm.rejection_reason && <small>ٹیم رد کرنے کی وجہ: {tm.rejection_reason}</small>}
          <div dir="ltr">Manager: {tm.manager_name || '-'} {tm.manager_mobile || ''}</div>
          <div dir="ltr">Captain Gmail: {tm.captain_email || 'Not added yet'}</div>
          <button className="btn alt" onClick={() => updateCaptainEmail(tm)}>کپتان کی Gmail درج / تبدیل کریں</button>
          {last && <div dir="ltr">Txn: {last.transaction_id || '-'} · PKR {last.amount} <button className="btn alt" onClick={() => shot(last)}>Screenshot</button></div>}
          {tm.payment_rejection_reason && <small>ادائیگی رد کرنے کی وجہ: {tm.payment_rejection_reason}</small>}
          <details><summary>کھلاڑیوں کی فہرست ({ps.length})</summary>{ps.map((pp, ix) => { const po = tobj.filter(o => o.player_id === pp.id); return (<div key={pp.id} style={{ margin: '8px 0', paddingBottom: 8, borderBottom: '1px solid #333' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <img src={pub(pp.photo_path)} alt="" width="48" height="48" style={{ borderRadius: 8, objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>{pp.name} {ix === 0 && '★ کپتان 1'} {ix === 1 && '★ کپتان 2'}<div dir="ltr"><small>{pp.age} · {pp.position} · {pp.mobile || '-'}</small></div></div>
              <button className="btn alt" onClick={() => setOf({ player_id: pp.id, team_id: tm.id, reason: '', details: '', raised_by: '' })}>⚠ اعتراض لگائیں</button></div>
            {po.map(o => <div key={o.id} className="err" style={{ marginTop: 6 }}><span className={'badge ' + (o.status === 'open' ? 'n' : 'v')}>{o.status === 'open' ? 'کھلا' : o.status === 'resolved' ? 'حل شدہ' : 'مسترد'}</span> <b>{o.reason}</b>{o.details && <div style={{ whiteSpace: 'pre-wrap' }}>{o.details}</div>}{o.raised_by && <small>اعتراض کرنے والا: {o.raised_by}</small>}</div>)}
            {of && of.player_id === pp.id && (<form className="card" onSubmit={addObjection}><h3>{pp.name} پر اعتراض</h3>
              <label>وجہ (مختصر)</label><input value={of.reason} onChange={e => setOf({ ...of, reason: e.target.value })} placeholder="مثلاً: عمر زیادہ ہے / دوسرے علاقے کا کھلاڑی" />
              <label>تفصیل</label><textarea className="ta" rows="3" value={of.details} onChange={e => setOf({ ...of, details: e.target.value })} />
              <label>اعتراض کس نے کیا (اختیاری)</label><input value={of.raised_by} onChange={e => setOf({ ...of, raised_by: e.target.value })} />
              <div className="row" style={{ justifyContent: 'flex-start' }}><button className="btn">اعتراض درج کریں</button><button type="button" className="btn alt" onClick={() => setOf(null)}>منسوخ</button></div></form>)}</div>); })}</details>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" onClick={() => setTeamStatus(tm, 'approved')}>✓ ٹیم منظور</button>
            <button className="btn alt" onClick={() => setTeamStatus(tm, 'rejected')}>ٹیم مسترد</button>
            <button className="btn alt" onClick={() => createCaptainAccount(tm)}>کپتان کا لاگ اِن اکاؤنٹ بنائیں</button>
            <button className="btn" onClick={() => setPay(tm, 'verified')}>✓ ادائیگی منظور</button>
            <button className="btn alt" onClick={() => setPay(tm, 'notverified')}>ادائیگی زیرِ تصدیق</button>
            <button className="btn alt" onClick={() => setPay(tm, 'rejected')}>ادائیگی مسترد</button>
            <button className="btn alt" onClick={() => delTeam(tm)}>ٹیم حذف</button></div></div>); })}</>)}
    {tab === 'obj' && (<><div className="card">کل اعتراضات: {objs.length} · کھلے: {objs.filter(x => x.status === 'open').length}</div>
      {objs.length === 0 && <div className="card">ابھی کوئی اعتراض درج نہیں۔ ٹیمیں ٹیب میں کھلاڑی کے سامنے "اعتراض لگائیں" دبائیں۔</div>}
      {objs.map(o => { const tm = teams.find(x => x.id === o.team_id); const pp = tm && (tm.players || []).find(x => x.id === o.player_id);
        return (<div className="card" key={o.id}><span className={'badge ' + (o.status === 'open' ? 'n' : 'v')}>{o.status === 'open' ? 'کھلا' : o.status === 'resolved' ? 'حل شدہ' : 'مسترد'}</span> <b>{pp ? pp.name : 'کھلاڑی'}</b> · {tm ? tm.name : 'ٹیم'} <small>{tm && tm.reg_id}</small>
          <p><b>{o.reason}</b></p>{o.details && <p style={{ whiteSpace: 'pre-wrap' }}>{o.details}</p>}
          {o.raised_by && <div><small>اعتراض کرنے والا: {o.raised_by}</small></div>}{o.admin_note && <div><small>ایڈمن نوٹ: {o.admin_note}</small></div>}
          <small dir="ltr">{new Date(o.created_at).toLocaleString()}</small>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            {o.status !== 'open' && <button className="btn alt" onClick={() => setObj(o, 'open')}>دوبارہ کھولیں</button>}
            {o.status !== 'resolved' && <button className="btn" onClick={() => setObj(o, 'resolved')}>حل ہو گیا</button>}
            {o.status !== 'dismissed' && <button className="btn alt" onClick={() => setObj(o, 'dismissed')}>اعتراض مسترد</button>}
            <button className="btn alt" onClick={() => delObj(o)}>حذف</button></div></div>); })}</>)}
  </div>);
}
