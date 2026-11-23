'use client';
import { useEffect, useState, useRef } from 'react';
import { Upload } from 'tus-js-client';
import { useRouter } from 'next/navigation';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { shrink } from '../../lib/img';
const POS = [['batter','Batter'],['bowler','Bowler'],['all_rounder','All-Rounder'],['wicket_keeper','Wicket-Keeper']];
const MOB = /^(03\d{9}|\+923\d{9})$/;
const blank = () => ({ name:'', mobile:'', age:'', position:'', file:null });
export default function Register() {
  const { t, lang } = useLang(); const router = useRouter();
  const [team, setTeam] = useState(''); const [email, setEmail] = useState(''); const [open, setOpen] = useState(true);
  useEffect(() => { supabase.rpc('public_stats').then(({ data }) => data && setOpen(data.open !== false)); }, []);
  const [pl, setPl] = useState(Array.from({ length: 15 }, blank));
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [uploadStatus, setUploadStatus] = useState('');
  const folderRef = useRef(''); const uploadedRef = useRef({});
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
      if (!folderRef.current) folderRef.current = crypto.randomUUID();
      const folder = folderRef.current; const players = [];
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const projectId = new URL(supabaseUrl).hostname.split('.')[0];
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || anonKey;

      const uploadTus = (file, path, index) => new Promise((resolve, reject) => {
        const task = new Upload(file, {
          endpoint: 'https://' + projectId + '.storage.supabase.co/storage/v1/upload/resumable',
          retryDelays: [0, 2000, 5000, 10000, 20000],
          headers: { apikey: anonKey, authorization: 'Bearer ' + authToken },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          chunkSize: 6 * 1024 * 1024,
          metadata: { bucketName: 'player-photos', objectName: path, contentType: 'image/jpeg', cacheControl: '3600' },
          onError: reject,
          onProgress: (sent, total) => setUploadStatus('Uploading player ' + (index + 1) + '/15: ' + Math.round(sent / total * 100) + '%'),
          onSuccess: () => resolve()
        });
        task.start();
      });

      for (let i = 0; i < 15; i++) {
        const p = pl[i];
        let saved = uploadedRef.current[i];
        if (!saved || saved.file !== p.file) {
          const path = folder + '/' + i + '-' + crypto.randomUUID() + '.jpg';
          setUploadStatus('Uploading player ' + (i + 1) + '/15...');
          const blob = await shrink(p.file, 900);
          await uploadTus(blob, path, i);
          uploadedRef.current[i] = { file: p.file, path };
        }
        players.push({ name: p.name.trim(), mobile: i < 2 ? p.mobile : '', age: +p.age, position: p.position, photo_path: uploadedRef.current[i].path });
      }
      setUploadStatus('Saving team registration...');
      const { data, error } = await supabase.rpc('submit_team', { t: { name: team.trim(), email: email.trim() }, p: players });
      if (error) throw error;
      router.push('/pay?ref=' + encodeURIComponent(data));
    } catch (x) {
      console.error('BJL registration upload failed:', x);
      setErr(x?.message || String(x));
      setUploadStatus('');
    }
    setBusy(false);
  }
  return (<form onSubmit={submit}>
    <h2>{t('regTitle')}</h2>
    <div className="card bjl-squad-rules">
      <b>{lang === 'ur' ? 'اسکواڈ کے لازمی اصول' : 'Squad rules'}</b>
      <p>{lang === 'ur' ? 'رجسٹریشن صرف ویب سائٹ پر آن لائن ہوگی۔ ہر ٹیم میں کل 15 کھلاڑی ہوں گے: کپتان 1، کپتان 2 اور 13 دیگر کھلاڑی۔ میچ کے 11 کھلاڑی انہی رجسٹرڈ 15 میں سے ہوں گے۔ ان کے علاوہ کوئی باہر کا کھلاڑی ٹیم کی طرف سے نہیں کھیل سکتا۔ فارم جمع کرنے کے بعد ریفرنس محفوظ کریں اور ویب سائٹ کے Payment صفحے سے ادائیگی جمع کروائیں۔' : 'Registration is online only through this website. Each team must register exactly 15 players: Captain 1, Captain 2 and 13 other players. The playing XI must be selected from these same 15 registered players. No outside player may play for the team. Save the reference after submitting the form, then complete payment on the website.'}</p>
    </div>
    {!open && <div className="warn">{t('regClosed')}</div>}
    <div className="card"><label>{t('teamName')}</label><input value={team} onChange={e => setTeam(e.target.value)} />
      <label>{t('emailLead')}</label><input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} /></div>
    {block(0, t('cap1'), true)}{block(1, t('cap2'), true)}
    <h3>{t('others13')}</h3>
    {pl.slice(2).map((_, k) => block(k + 2, `${t('player')} ${k + 1} / 13`, false))}
    {uploadStatus && <div className="card" role="status">{uploadStatus}</div>}{err && <div className="err">{err}</div>}
    <button className="btn" disabled={busy || !open}>{busy ? t('sending') : t('submit')}</button>
  </form>);
}
