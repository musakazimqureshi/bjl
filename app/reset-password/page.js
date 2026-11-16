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
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role');
    if (r === 'admin' || r === 'team') setRole(r);
    if (params.get('mode') === 'reset' || window.location.hash.includes('type=recovery')) setStage('new');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('new');
    });
    return () => subscription.unsubscribe();
  }, []);

  async function sendReset(e) {
    e.preventDefault();
    setMessage('');
    if (!email.trim()) return setMessage('براہ کرم اپنی رجسٹرڈ ای میل درج کریں۔');
    setBusy(true);
    const redirectTo = window.location.origin + '/reset-password?mode=reset&role=' + role;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setMessage(error ? 'اگر یہ ای میل رجسٹرڈ ہے تو ری سیٹ لنک بھیجنے میں مسئلہ ہوا: ' + error.message : 'اگر یہ ای میل ہمارے ریکارڈ میں موجود ہے تو پاس ورڈ تبدیل کرنے کا لنک بھیج دیا گیا ہے۔ اپنا Inbox اور Spam فولڈر چیک کریں۔');
    setBusy(false);
  }

  async function savePassword(e) {
    e.preventDefault();
    setMessage('');
    if (password.length < 8) return setMessage('نیا پاس ورڈ کم از کم 8 حروف یا نمبروں پر مشتمل ہونا چاہیے۔');
    if (password !== confirm) return setMessage('نیا پاس ورڈ اور تصدیقی پاس ورڈ ایک جیسے نہیں ہیں۔');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : 'آپ کا نیا پاس ورڈ محفوظ ہو گیا ہے۔ اب لاگ اِن کر سکتے ہیں۔');
    if (!error) { setPassword(''); setConfirm(''); }
    setBusy(false);
  }

  return (<div className="card" style={{maxWidth:520,margin:'24px auto'}}>
    <h2>{role === 'admin' ? 'Admin Password Reset' : 'Team Password Reset'}</h2>
    {stage === 'request' ? (<form onSubmit={sendReset}>
      <p>اپنے اکاؤنٹ کی رجسٹرڈ Gmail درج کریں۔ آپ کو تصدیقی ری سیٹ لنک بھیجا جائے گا۔</p>
      <label>Registered Gmail</label>
      <input type="email" dir="ltr" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
      {message && <div className="good">{message}</div>}
      <button className="btn" disabled={busy}>{busy ? 'بھیجا جا رہا ہے...' : 'Send Reset Link'}</button>
    </form>) : (<form onSubmit={savePassword}>
      <p>اپنا نیا پاس ورڈ درج کریں۔ پرانے پاس ورڈ کی ضرورت نہیں ہے۔</p>
      <label>New Password</label>
      <input type="password" dir="ltr" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
      <label>Confirm New Password</label>
      <input type="password" dir="ltr" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
      {message && <div className={message.includes('محفوظ') ? 'good' : 'err'}>{message}</div>}
      <button className="btn" disabled={busy}>{busy ? 'محفوظ ہو رہا ہے...' : 'Save New Password'}</button>
    </form>)}
    <p><Link href={role === 'admin' ? '/admin' : '/team'}>واپس لاگ اِن پر جائیں</Link></p>
  </div>);
}
