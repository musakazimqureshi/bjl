'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { EASYPAISA, CONTACTS } from '../../lib/config';
export default function Pay() {
  const { t } = useLang();
  const [ref, setRef] = useState(''); const [file, setFile] = useState(null);
  const [err, setErr] = useState(''); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false); const [copied, setCopied] = useState(false);
  useEffect(() => { const r = new URLSearchParams(window.location.search).get('ref'); if (r) setRef(r); }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(EASYPAISA.number); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) {}
  }
  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!ref.trim() || !file) return setErr(t('payMissing'));
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 3 * 1024 * 1024) return setErr(t('payFile'));
    setBusy(true);
    try {
      const r = ref.trim().toUpperCase();
      const path = `${r}/${Date.now()}.${file.type === 'image/png' ? 'png' : 'jpg'}`;
      const { error: e1 } = await supabase.storage.from('payments').upload(path, file);
      if (e1) throw e1;
      const { error: e2 } = await supabase.rpc('submit_payment', { p_ref: r, p_path: path });
      if (e2) throw e2;
      setDone(true);
    } catch (x) { setErr(x.message || String(x)); }
    setBusy(false);
  }
  const org = CONTACTS[0];
  const wa = `https://wa.me/${org.num}?text=${encodeURIComponent(t('msgPaid') + ref.toUpperCase())}`;
  if (done) return (<div><div className="good">{t('payOk')} <div className="big">{ref.toUpperCase()}</div></div>
    <p><a className="btn" href={wa} target="_blank" rel="noopener noreferrer">{t('payWA')}</a></p></div>);
  return (<form onSubmit={submit}>
    <h2>{t('payTitle')}</h2>
    <div className="card"><p>{t('payInfo')}</p>
      <div>{t('accNo')}</div><div className="big" dir="ltr">{EASYPAISA.number}</div>
      <button type="button" className="btn" onClick={copy}>{copied ? t('copied') : t('copy')}</button>
      <p>{t('accTitle')}: <b>{EASYPAISA.title}</b></p>
      <p>{t('amount')}: <b>Rs. {EASYPAISA.fee.toLocaleString()}</b></p></div>
    <div className="card">
      <label>{t('refLabel')}</label><input value={ref} onChange={e => setRef(e.target.value)} dir="ltr" />
      <small>{t('saveRef')}</small><br />
      <label>{t('shot')}</label><input type="file" accept="image/jpeg,image/png" onChange={e => setFile(e.target.files[0])} />
    </div>
    {err && <div className="err">{err}</div>}
    <div className="row" style={{ justifyContent: 'flex-start' }}>
      <button className="btn" disabled={busy}>{busy ? t('sending') : t('paySubmit')}</button>
      <a className="btn alt" href={wa} target="_blank" rel="noopener noreferrer">{t('payWA')}</a>
    </div>
    <div className="card">{t('payNote')}<div style={{ marginTop: 10 }}><Link href="/" className="btn alt">{t('payLater')}</Link></div></div>
  </form>);
}
