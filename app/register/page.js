'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { shrink } from '../../lib/img';
const POS = [['batter','Batter'],['bowler','Bowler'],['all_rounder','All-Rounder'],['wicket_keeper','Wicket-Keeper']];
const MOB = /^(03\d{9}|\+923\d{9})$/;
const blank = () => ({ name:'', mobile:'', age:'', position:'', file:null });
export default function Register() {
  const { t } = useLang(); const router = useRouter();
  const [team, setTeam] = useState(''); const [email, setEmail] = useState(''); const [open, setOpen] = useState(true);
  useEffect(() => { supabase.rpc('public_stats').then(({ data }) => data && setOpen(data.open !== false)); }, []);
  const [pl, setPl] = useState(Array.from({ length: 15 }, blank));
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const up = (i, k, v) => setPl(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const block = (i, title, mobile) => { const p = pl[i]; return (<div className="card" key={i}><b>{title}</b>
    <input placeholder={t('pname')} value={p.name} onChange={e => up(i, 'name', e.target.value)} />
    {mobile && <input placeholder={t('mobLead')} inputMode="numeric" dir="ltr" value={p.mobile} onChange={e => up(i, 'mobile', e.target.value)} />}
    <input placeholder={t('age')} type="number" min="5" max="60" value={p.age} onChange={e => up(i, 'age', e.target.value)} />
    <select value={p.position} onChange={e => up(i, 'position', e.target.value)}><option value="">{t('pos')}</option>
      {POS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</select>
    <label>{t('photo')}</label><input type="file" accept="image/jpeg,image/png" onChange={e => up(i, 'file', e.target.files[0])} /></div>); };
  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!team.trim()) return setErr(t('eTeam'));
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr(t('emailLead'));
    for (let i = 0; i < 15; i++) {
      const p = pl[i]; const n = ' #' + (i + 1);
      if (!p.name.trim() || !p.age || !p.position || !p.file) return setErr(t('eMissing') + n);
      if (i < 2 && !MOB.test(p.mobile)) return setErr(t('eMob') + n);
      if (!['image/jpeg', 'image/png'].includes(p.file.type) || p.file.size > 15 * 1024 * 1024) return setErr(t('ePhoto') + n);
    }
    if (pl[0].mobile === pl[1].mobile) return setErr(t('eDup'));
    setBusy(true);
    try {
      const folder = crypto.randomUUID(); const players = [];
      for (let i = 0; i < 15; i++) {
        const p = pl[i]; const path = `${folder}/${i}.jpg`;
        const blob = await shrink(p.file, 900);
        const { error } = await supabase.storage.from('player-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        players.push({ name: p.name.trim(), mobile: i < 2 ? p.mobile : '', age: +p.age, position: p.position, photo_path: path });
      }
      const { data, error } = await supabase.rpc('submit_team', { t: { name: team.trim(), email: email.trim().toLowerCase() }, p: players });
      if (error) throw error;
      const { data: loginData, error: loginError } = await supabase.functions.invoke('captain-login-provisioner', {
        body: { regId: data, email: email.trim().toLowerCase(), password: '12345678' }
      });
      if (loginError || !loginData?.ok) {
        setErr('ٹیم کی رجسٹریشن محفوظ ہو گئی ہے، لیکن لاگ اِن اکاؤنٹ بنانے میں مسئلہ آیا۔ منتظم سے رابطہ کریں۔');
        return;
      }
      router.push('/pay?ref=' + encodeURIComponent(data));
    } catch (x) { setErr(x.message || String(x)); }
    setBusy(false);
  }
  return (<form onSubmit={submit}>
    <h2>{t('regTitle')}</h2>
    {!open && <div className="warn">{t('regClosed')}</div>}
    <div className="card"><label>{t('teamName')}</label><input value={team} onChange={e => setTeam(e.target.value)} />
      <label>{t('emailLead')}</label><input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} /></div>
    {block(0, t('cap1'), true)}{block(1, t('cap2'), true)}
    <h3>{t('others13')}</h3>
    {pl.slice(2).map((_, k) => block(k + 2, `${t('player')} ${k + 1} / 13`, false))}
    {err && <div className="err">{err}</div>}
    <button className="btn" disabled={busy || !open}>{busy ? t('sending') : t('submit')}</button>
  </form>);
}
