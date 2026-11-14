'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
const ext = f => (f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg');
const okImg = f => f && ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 3 * 1024 * 1024;
export default function Admin() {
  const [ready, setReady] = useState(false); const [isAdmin, setIsAdmin] = useState(false); const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('teams'); const [c, setC] = useState({}); const [ann, setAnn] = useState([]); const [teams, setTeams] = useState([]);
  const [f, setF] = useState({ title: '', description: '', date: '', time: '', file: null });
  async function check() {
    const { data: { session } } = await supabase.auth.getSession();
    setLogged(!!session);
    if (session) { const { data } = await supabase.from('admins').select('id').eq('id', session.user.id); setIsAdmin(!!(data && data.length)); }
    setReady(true);
  }
  async function load() {
    const { data } = await supabase.rpc('public_content'); setC(data || {});
    const { data: a } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }); setAnn(a || []);
  }
  async function loadTeams() {
    const { data } = await supabase.from('teams').select('*, players:players!players_team_id_fkey(*), payments(*)').order('created_at', { ascending: false });
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
  async function delTeam(tm) {
    if (!confirm('پوری ٹیم ہمیشہ کے لیے حذف کریں؟')) return;
    const { error } = await supabase.from('teams').delete().eq('id', tm.id); setMsg(error ? error.message : 'ٹیم حذف ہو گئی'); loadTeams();
  }
  useEffect(() => { check(); }, []);
  useEffect(() => { if (isAdmin) { load(); loadTeams(); } }, [isAdmin]);
  async function login(e) { e.preventDefault(); setMsg(''); const { error } = await supabase.auth.signInWithPassword({ email, password: pw }); if (error) return setMsg(error.message); check(); }
  async function logout() { await supabase.auth.signOut(); setLogged(false); setIsAdmin(false); }
  const set = (k, v) => setC(x => ({ ...x, [k]: v }));
  async function save(keys) {
    setMsg('');
    const { error } = await supabase.from('settings').upsert(keys.map(k => ({ key: k, value: c[k] || '' })));
    setMsg(error ? error.message : 'محفوظ ہو گیا ✔');
  }
  async function uploadPhoto(n, file) {
    setMsg(''); if (!okImg(file)) return setMsg('تصویر JPG/PNG/WEBP اور 3MB تک ہونی چاہیے۔');
    const path = `site/photo${n}-${Date.now()}.${ext(file)}`;
    const { error } = await supabase.storage.from('announcements').upload(path, file); if (error) return setMsg(error.message);
    const { error: e2 } = await supabase.from('settings').upsert({ key: `photo${n}_path`, value: path });
    setMsg(e2 ? e2.message : 'تصویر لگ گئی ✔'); load();
  }
  async function addAnn(e) {
    e.preventDefault(); setMsg('');
    if (!f.title.trim() || !f.date || !okImg(f.file)) return setMsg('عنوان، تاریخ اور تصویر (JPG/PNG، 3MB تک) ضروری ہیں۔');
    const path = `ann/${Date.now()}.${ext(f.file)}`;
    const { error } = await supabase.storage.from('announcements').upload(path, f.file); if (error) return setMsg(error.message);
    const { error: e2 } = await supabase.from('announcements').insert({ title: f.title.trim(), description: f.description, image_path: path, announce_date: f.date, announce_time: f.time || null, published: true });
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
    <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
    <input placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} dir="ltr" />
    {msg && <div className="err">{msg}</div>}<button className="btn">Login</button></form>);
  if (!isAdmin) return (<div className="card"><div className="err">آپ ایڈمن نہیں ہیں۔</div><button className="btn" onClick={logout}>Logout</button></div>);
  const inp = (k, label, type = 'text') => (<><label>{label}</label><input type={type} value={c[k] || ''} onChange={e => set(k, e.target.value)} /></>);
  return (<div>
    <h2>BJL Admin</h2>
    <div className="tabs">
      {[['teams', 'ٹیمیں'], ['match', 'میچ سینٹر'], ['ann', 'اعلانات'], ['photos', 'تصاویر'], ['set', 'سیٹنگ']].map(([k, l]) => <button key={k} className={'btn alt' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setMsg(''); }}>{l}</button>)}
      <button className="btn" onClick={logout}>Logout</button></div>
    {msg && <div className="good">{msg}</div>}
    {tab === 'match' && (<><div className="card"><h3>آج کا فاتح</h3>
      {inp('winner_team', 'جیتنے والی ٹیم')}{inp('loser_team', 'ہارنے والی ٹیم')}
      <button className="btn" onClick={() => save(['winner_team', 'loser_team'])}>محفوظ کریں</button></div>
      <div className="card"><h3>اگلا میچ</h3>
        {inp('next_a', 'ٹیم A')}{inp('next_b', 'ٹیم B')}{inp('next_date', 'تاریخ', 'date')}{inp('next_time', 'وقت', 'time')}
        <button className="btn" onClick={() => save(['next_a', 'next_b', 'next_date', 'next_time'])}>محفوظ کریں</button></div></>)}
    {tab === 'ann' && (<><form className="card" onSubmit={addAnn}><h3>نیا اعلان</h3>
      <label>عنوان</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <label>تفصیل</label><input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
      <label>تاریخ</label><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
      <label>وقت</label><input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} />
      <label>تصویر</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setF({ ...f, file: e.target.files[0] })} />
      <button className="btn">شائع کریں</button></form>
      {ann.map(a => (<div className="card" key={a.id}><b>{a.title}</b> <small>{a.announce_date}</small> {a.published ? '✅' : '⛔'}
        <div className="row" style={{ justifyContent: 'flex-start' }}><button className="btn alt" onClick={() => toggle(a)}>{a.published ? 'چھپائیں' : 'دکھائیں'}</button>
          <button className="btn" onClick={() => del(a)}>حذف</button></div></div>))}</>)}
    {tab === 'photos' && [1, 2].map(n => (<div className="card" key={n}><h3>تصویر {n}</h3>
      {inp(`photo${n}_name`, 'نام')}<button className="btn alt" onClick={() => save([`photo${n}_name`])}>نام محفوظ کریں</button>
      <p><label>نئی تصویر چنیں</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadPhoto(n, e.target.files[0])} /></p></div>))}
    {tab === 'set' && (<div className="card"><h3>Ask Falak بٹن</h3>
      {inp('falak_whatsapp', 'WhatsApp نمبر (بین الاقوامی، مثلاً 923411620498)')}{inp('falak_btn', 'بٹن کا متن')}
      <button className="btn" onClick={() => save(['falak_whatsapp', 'falak_btn'])}>محفوظ کریں</button></div>)}
    {tab === 'teams' && (<><div className="card">کل ٹیمیں: {teams.length} · تصدیق شدہ: {teams.filter(x => x.payment === 'verified').length}</div>
      {teams.map(tm => { const ps = (tm.players || []).slice().sort((a, b) => a.seq - b.seq); const last = (tm.payments || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
        return (<div className="card" key={tm.id}><b>{tm.name}</b> <small>{tm.reg_id}</small> {tm.payment === 'verified' ? '✅ VERIFIED' : '❌ NOT VERIFIED'}
          <div dir="ltr">C1: {ps[0] && ps[0].name} {ps[0] && ps[0].mobile} | C2: {ps[1] && ps[1].name} {ps[1] && ps[1].mobile}</div>
          {last && <div dir="ltr">Txn: {last.transaction_id || '-'} <button className="btn alt" onClick={() => shot(last)}>Screenshot</button></div>}
          {tm.payment_rejection_reason && <small>رد کرنے کی وجہ: {tm.payment_rejection_reason}</small>}
          <details><summary>15 کھلاڑی</summary>{ps.map(pp => (<div key={pp.id} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0' }}>
            <img src={pub(pp.photo_path)} alt="" width="48" height="48" style={{ borderRadius: 8, objectFit: 'cover' }} />{pp.name} · {pp.age} · {pp.position}</div>))}</details>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" onClick={() => setPay(tm, 'verified')}>✓ تصدیق</button>
            <button className="btn alt" onClick={() => setPay(tm, 'notverified')}>غیر تصدیق شدہ</button>
            <button className="btn alt" onClick={() => setPay(tm, 'rejected')}>مسترد</button>
            <button className="btn alt" onClick={() => delTeam(tm)}>حذف</button></div></div>); })}</>)}
  </div>);
}
