'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
const POS = [['batter','Batter'],['bowler','Bowler'],['all_rounder','All-Rounder'],['wicket_keeper','Wicket-Keeper']];
const MOB = /^(03\d{9}|\+923\d{9})$/;
const blank = () => ({ name:'', mobile:'', age:'', position:'', file:null });
export default function Register() {
  const { t } = useLang(); const router = useRouter();
  const [team, setTeam] = useState({ name:'', manager_name:'', manager_mobile:'', cap:'', vice:'' });
  const [pl, setPl] = useState(Array.from({ length: 15 }, blank));
  const [err, setErr] = useState(''); const [ref, setRef] = useState(''); const [busy, setBusy] = useState(false);
  const up = (i, k, v) => setPl(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!team.name.trim() || !team.manager_name.trim() || team.cap === '' || team.vice === '') return setErr(t('eTeam'));
    if (!MOB.test(team.manager_mobile)) return setErr(t('eMob') + ' ' + t('mgrMob'));
    if (team.cap === team.vice) return setErr(t('eCap'));
    for (let i = 0; i < 15; i++) {
      const p = pl[i];
      if (!p.name.trim() || !p.age || !p.position || !p.file) return setErr(t('eMissing') + ' (#' + (i + 1) + ')');
      if ((String(i) === team.cap || String(i) === team.vice) && !MOB.test(p.mobile)) return setErr(t('eMob') + ' #' + (i + 1));
      if (!['image/jpeg', 'image/png'].includes(p.file.type) || p.file.size > 2 * 1024 * 1024) return setErr(t('ePhoto') + ' #' + (i + 1));
    }
    if (pl[+team.cap].mobile === pl[+team.vice].mobile) return setErr(t('eDup'));
    setBusy(true);
    try {
      const folder = crypto.randomUUID();
      const players = [];
      for (let i = 0; i < 15; i++) {
        const p = pl[i]; const ext = p.file.type === 'image/png' ? 'png' : 'jpg';
        const path = `${folder}/${i}.${ext}`;
        const { error } = await supabase.storage.from('player-photos').upload(path, p.file);
        if (error) throw error;
        players.push({ name: p.name.trim(), mobile: (String(i) === team.cap || String(i) === team.vice) ? p.mobile : '', age: +p.age, position: p.position, photo_path: path });
      }
      const { data, error } = await supabase.rpc('submit_team', {
        t: { name: team.name.trim(), manager_name: team.manager_name.trim(), manager_mobile: team.manager_mobile,
             captain_index: +team.cap, vice_index: +team.vice }, p: players });
      if (error) throw error;
      setRef(data); router.push('/pay?ref=' + encodeURIComponent(data));
    } catch (x) { setErr(x.message || String(x)); }
    setBusy(false);
  }
  if (ref) return <div className="good">{t('ok')} <div className="big">{ref}</div></div>;
  return (<form onSubmit={submit}>
    <h2>{t('regTitle')}</h2>
    <div className="card">
      <label>{t('teamName')}</label><input value={team.name} onChange={e => setTeam({ ...team, name: e.target.value })} />
      <label>{t('mgr')}</label><input value={team.manager_name} onChange={e => setTeam({ ...team, manager_name: e.target.value })} />
      <label>{t('mgrMob')}</label><input inputMode="numeric" value={team.manager_mobile} onChange={e => setTeam({ ...team, manager_mobile: e.target.value })} />
      <label>{t('captain')}</label>
      <select value={team.cap} onChange={e => setTeam({ ...team, cap: e.target.value })}><option value="">{t('select')}</option>
        {pl.map((p, i) => <option key={i} value={i}>{p.name || `${t('player')} ${i + 1}`}</option>)}</select>
      <label>{t('vice')}</label>
      <select value={team.vice} onChange={e => setTeam({ ...team, vice: e.target.value })}><option value="">{t('select')}</option>
        {pl.map((p, i) => <option key={i} value={i}>{p.name || `${t('player')} ${i + 1}`}</option>)}</select>
    </div>
    {pl.map((p, i) => (<div className="card" key={i}><b>{t('player')} {i + 1} / 15</b>
      <input placeholder={t('pname')} value={p.name} onChange={e => up(i, 'name', e.target.value)} />
      {(String(i) === team.cap || String(i) === team.vice) && <input placeholder={t('mobLead')} inputMode="numeric" value={p.mobile} onChange={e => up(i, 'mobile', e.target.value)} />}
      <input placeholder={t('age')} type="number" min="5" max="60" value={p.age} onChange={e => up(i, 'age', e.target.value)} />
      <select value={p.position} onChange={e => up(i, 'position', e.target.value)}><option value="">{t('pos')}</option>
        {POS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</select>
      <label>{t('photo')}</label><input type="file" accept="image/jpeg,image/png" onChange={e => up(i, 'file', e.target.files[0])} />
    </div>))}
    {err && <div className="err">{err}</div>}
    <button className="btn" disabled={busy}>{busy ? t('sending') : t('submit')}</button>
  </form>);
}
