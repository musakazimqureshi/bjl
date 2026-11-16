'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ResetPassword() {
  const [role, setRole] = useState('team');
  const [stage, setStage] = useState('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const requestedRole = params.get('role');
    if (requestedRole === 'admin' || requestedRole === 'team') setRole(requestedRole);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') {
        setStage('new');
        setMessage('ای میل کی تصدیق ہو گئی۔ اب نیا پاس ورڈ درج کریں۔');
      }
    });

    (async () => {
      try {
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        if (session && (params.get('mode') === 'reset' || window.location.hash.includes('type=recovery'))) {
          setStage('new');
          setMessage('ای میل کی تصدیق ہو گئی۔ اب نیا پاس ورڈ درج کریں۔');
        } else if (params.get('mode') === 'reset') {
          setStage('request');
          setMessage('ری سیٹ لنک کی تصدیق نہیں ہو سکی یا لنک ختم ہو چکا ہے۔ دوبارہ نیا لنک منگوائیں۔');
        }
      } catch (error) {
        if (!active) return;
        setStage('request');
        setMessage('ری سیٹ لنک کھولنے میں مسئلہ ہوا: ' + (error?.message || 'براہ کرم نیا لنک منگوائیں۔'));
      }
    })();

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function sendReset(e) {
    e.preventDefault();
    setMessage('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setMessage('براہ کرم اپنی رجسٹرڈ ای میل درج کریں۔');
    setBusy(true);
    const redirectTo = window.location.origin + '/reset-password?mode=reset&role=' + role;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
    setMessage(error
      ? 'ری سیٹ ای میل بھیجنے میں مسئلہ ہوا: ' + error.message
      : 'ری سیٹ ای میل بھیج دی گئی ہے۔ Gmail کے Inbox اور Spam/Junk فولڈر میں تازہ ترین ای میل دیکھیں۔ لنک اسی Preview ویب سائٹ پر کھولیں۔');
    setBusy(false);
  }

  async function savePassword(e) {
    e.preventDefault();
    setMessage('');
    if (password.length < 8) return setMessage('نیا پاس ورڈ کم از کم 8 حروف یا نمبروں پر مشتمل ہونا چاہیے۔');
    if (password !== confirm) return setMessage('نیا پاس ورڈ اور تصدیقی پاس ورڈ ایک جیسے نہیں ہیں۔');
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage('تصدیقی سیشن موجود نہیں۔ براہ کرم دوبارہ Forgot Password سے نیا لنک منگوائیں۔');
      setStage('request');
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? 'پاس ورڈ محفوظ نہیں ہوا: ' + error.message : 'آپ کا نیا پاس ورڈ محفوظ ہو گیا ہے۔ اب Admin Login پر جا کر نئے پاس ورڈ سے لاگ اِن کریں۔');
    if (!error) { setPassword(''); setConfirm(''); await supabase.auth.signOut(); setStage('request'); }
    setBusy(false);
  }

  return (<div className="card" style={{maxWidth:520,margin:'24px auto'}}>
    <h2>{role === 'admin' ? 'Admin Password Reset' : 'Team Password Reset'}</h2>
    {stage === 'request' ? (<form onSubmit={sendReset}>
      <p>اپنے اکاؤنٹ کی رجسٹرڈ Gmail درج کریں۔ آپ کو تصدیقی ری سیٹ لنک بھیجا جائے گا۔</p>
      <label>Registered Gmail</label>
      <input type="email" dir="ltr" autoComplete="email" autoCapitalize="none" spellCheck="false" value={email} onChange={e => setEmail(e.target.value)} required />
      {message && <div className="err">{message}</div>}
      <button className="btn" disabled={busy}>{busy ? 'بھیجا جا رہا ہے...' : 'Send Reset Link'}</button>
    </form>) : (<form onSubmit={savePassword}>
      <p>ای میل کی تصدیق ہو گئی ہے۔ اپنا نیا پاس ورڈ درج کریں۔ پرانے پاس ورڈ کی ضرورت نہیں ہے۔</p>
      <label>New Password</label>
      <input type="password" dir="ltr" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck="false" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
      <label>Confirm New Password</label>
      <input type="password" dir="ltr" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck="false" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
      {message && <div className={message.includes('محفوظ ہو گیا') ? 'good' : 'err'}>{message}</div>}
      <button className="btn" disabled={busy}>{busy ? 'محفوظ ہو رہا ہے...' : 'Save New Password'}</button>
    </form>)}
    <p><Link href={role === 'admin' ? '/admin' : '/team'}>واپس لاگ اِن پر جائیں</Link></p>
  </div>);
}
