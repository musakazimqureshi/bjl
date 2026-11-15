'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { shrink } from '../../lib/img';
const ext = f => (f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg');
const okImg = f => f && ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 15 * 1024 * 1024;
export default function Admin() {
  const [ready, setReady] = useState(false); const [isAdmin, setIsAdmin] = useState(false); const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('teams'); const [c, setC] = useState({}); const [ann, setAnn] = useState([]); const [teams, setTeams] = useState([]); const [qs, setQs] = useState([]); const [qf, setQf] = useState({ body: '', book: 'نہج البلاغہ (سید رضیؒ)', ref: '' }); const [moms, setMoms] = useState([]); const [mf, setMf] = useState({ caption: '', date: '', files: [] });
  const [f, setF] = useState({ title: '', description: '', date: '', time: '', file: null });
  async function check() {
    const { data: { session } } = await supabase.auth.getSession();
    setLogged(!!session);
    if (session) { const { data } = await supabase.from('admins').select('id').eq('id', session.user.id); setIsAdmin(!!(data && data.length)); }
    setReady(true);
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
    <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
    <input placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} dir="ltr" />
    {msg && <div className="err">{msg}</div>}<button className="btn">Login</button></form>);
  if (!isAdmin) return (<div className="card"><div className="err">آپ ایڈمن نہیں ہیں۔</div><button className="btn" onClick={logout}>Logout</button></div>);
  const inp = (k, label, type = 'text') => (<><label>{label}</label><input type={type} value={c[k] || ''} onChange={e => set(k, e.target.value)} /></>);
  const show = (k, l) => (<label><input type="checkbox" checked={c[k] !== '0'} onChange={e => set(k, e.target.checked ? '1' : '0')} style={{ width: 'auto' }} /> {l}</label>);
  const pa = p => supabase.storage.from('announcements').getPublicUrl(p).data.publicUrl;
  return (<div>
    <h2>BJL Admin</h2>
    <div className="tabs">
      {[['teams', 'ٹیمیں'], ['match', 'میچ سینٹر'], ['ann', 'اعلانات'], ['people', 'ٹیم تصاویر'], ['moms', 'BJL Moments'], ['quotes', 'اقوال'], ['set', 'سیٹنگ']].map(([k, l]) => <button key={k} className={'btn alt' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setMsg(''); }}>{l}</button>)}
      <button className="btn" onClick={logout}>Logout</button></div>
    {msg && <div className="good">{msg}</div>}
    {tab === 'match' && (<><div className="card"><h3>آج کا فاتح</h3>
      {inp('winner_team', 'جیتنے والی ٹیم')}{inp('loser_team', 'ہارنے والی ٹیم')}{inp('winner_date', 'میچ کی تاریخ', 'date')}{show('winner_show', 'ہوم پیج پر دکھائیں')}
      <button className="btn" onClick={() => save(['winner_team', 'loser_team', 'winner_date', 'winner_show'])}>محفوظ کریں</button></div>
      <div className="card"><h3>اگلا میچ</h3>
        {inp('next_a', 'ٹیم A')}{inp('next_b', 'ٹیم B')}{inp('next_date', 'تاریخ', 'date')}{inp('next_time', 'وقت', 'time')}{show('next_show', 'ہوم پیج پر دکھائیں')}
        <button className="btn" onClick={() => save(['next_a', 'next_b', 'next_date', 'next_time', 'next_show'])}>محفوظ کریں</button></div></>)}
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
    {tab === 'people' && (<>{[[1, 'AMAN MALIK – MEMBER'], [2, 'WALEED AFRIDI – MEMBER'], [3, 'MUHAMMAD HASNAIN – MEMBER'], [4, 'FALAK – ORGANIZER']].map(([n, l]) => (<div className="card" key={n}><h3>{l}</h3>
      {c['person' + n + '_path'] && <img src={pa(c['person' + n + '_path'])} alt="" width="90" style={{ borderRadius: 8 }} />}
      <p><label>نئی تصویر چنیں</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && uploadKey('person' + n, e.target.files[0])} /></p></div>))}
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
      <button className="btn" onClick={() => save(['falak_whatsapp', 'falak_btn', 'falak_msg'])}>محفوظ کریں</button></div>)}
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
