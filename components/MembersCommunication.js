'use client';
import { useMemo, useState } from 'react';

const MEMBERS = [
  { id: 'hasnain', name: 'Muhammad Hasnain', short: 'Hasnain', phone: '923350541078' },
  { id: 'waleed', name: 'Waleed Afridi', short: 'Waleed', phone: '923145453155' }
];

const TEMPLATES = [
  { id: 'meeting', group: 'Meeting & coordination', title: 'Meeting request', en: n => `Assalam-o-Alaikum ${n} bhai! Falak would like to arrange an important meeting regarding BJL. Please share your availability so the meeting time can be finalized. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! فلک BJL کے حوالے سے ایک اہم میٹنگ کرنا چاہتے ہیں۔ براہِ کرم اپنی دستیابی بتا دیں تاکہ میٹنگ کا وقت طے کیا جا سکے۔ شکریہ۔` },
  { id: 'pending-teams', group: 'Registration & payments', title: 'Pending team follow-up', en: n => `Assalam-o-Alaikum ${n} bhai! Please review team registrations and payment entries on the BJL website. Check pending cases in the Admin Dashboard, verify the records, and update Falak. Do not mark any team as confirmed without verification. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم BJL ویب سائٹ پر ٹیموں کی رجسٹریشن اور ادائیگیوں کا جائزہ لیں۔ ایڈمن ڈیش بورڈ میں زیرِ التوا کیسز چیک کریں، ریکارڈ کی تصدیق کریں اور فلک کو اپڈیٹ دیں۔ تصدیق کے بغیر کسی ٹیم کو کنفرم نہ کریں۔ شکریہ۔` },
  { id: 'payment', group: 'Registration & payments', title: 'Payment verification reminder', en: n => `Assalam-o-Alaikum ${n} bhai! Please review pending BJL payments in the Admin Dashboard. Check each team's transaction details and screenshot. Verify a payment only after confirming the details, and inform Falak if there is any issue.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم ایڈمن ڈیش بورڈ میں BJL کی زیرِ التوا ادائیگیوں کا جائزہ لیں۔ ہر ٹیم کی ٹرانزیکشن تفصیلات اور اسکرین شاٹ چیک کریں۔ مکمل تصدیق کے بعد ہی ادائیگی ویریفائی کریں، اور کسی مسئلے کی صورت میں فلک کو اطلاع دیں۔` },
  { id: 'registration', group: 'Registration & payments', title: 'Registration details check', en: n => `Assalam-o-Alaikum ${n} bhai! Please check team registrations on the BJL website. Make a list of teams with incomplete information, player details, or documents and send it to Falak. Do not approve an entry until its details are confirmed.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم BJL ویب سائٹ پر ٹیموں کی رجسٹریشن چیک کریں۔ جن ٹیموں کی معلومات، کھلاڑیوں کی تفصیلات یا دستاویزات نامکمل ہوں، ان کی فہرست بنا کر فلک کو بھیج دیں۔ تصدیق کے بغیر کسی انٹری کو منظور نہ کریں۔` },
  { id: 'ground-time', group: 'Match day', title: 'Reach the ground on time', en: n => `Assalam-o-Alaikum ${n} bhai! Please reach Dab Ground before the scheduled BJL match time. Check the ground and match arrangements so the teams do not have to wait. Inform Falak immediately if you are delayed.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم BJL میچ کے مقررہ وقت سے پہلے ڈب گراؤنڈ پہنچ جائیں۔ گراؤنڈ اور میچ کے انتظامات چیک کر لیں تاکہ ٹیموں کو انتظار نہ کرنا پڑے۔ اگر تاخیر ہو تو فوراً فلک کو اطلاع دیں۔` },
  { id: 'falak-absent', group: 'Match day', title: 'Falak unavailable today', en: n => `Assalam-o-Alaikum ${n} bhai! Falak will not be present at the ground during today's match. Please handle BJL match arrangements, team coordination, and necessary announcements on his behalf. Keep a record of important updates and send Falak a report afterward. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! آج فلک میچ کے وقت گراؤنڈ میں موجود نہیں ہوں گے۔ براہِ کرم ان کی طرف سے BJL کے میچ انتظامات، ٹیموں کے ساتھ رابطہ اور ضروری اعلانات سنبھال لیں۔ اہم اپڈیٹس کا ریکارڈ رکھیں اور بعد میں فلک کو رپورٹ بھیج دیں۔ شکریہ۔` },
  { id: 'match-duty', group: 'Match day', title: 'Handle match arrangements', en: n => `Assalam-o-Alaikum ${n} bhai! For today's match, please coordinate both teams' attendance, overs, umpire/scorer arrangements, and result entry. Send the result and important details to Falak after the match.`, ur: n => `السلام علیکم ${n} بھائی! آج کے میچ میں دونوں ٹیموں کی حاضری، اوورز، امپائر/اسکورر کے انتظامات اور نتیجے کے اندراج پر توجہ دیں۔ میچ کے بعد نتیجہ اور اہم تفصیلات فلک کو بھیج دیں۔` },
  { id: 'team-coordination', group: 'Match day', title: 'Coordinate with both teams', en: n => `Assalam-o-Alaikum ${n} bhai! Please contact the captains of both teams and confirm their arrival and player availability. If the schedule or venue changes, inform both teams on time and update Falak.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم دونوں ٹیموں کے کپتانوں سے رابطہ کر کے ان کی آمد اور کھلاڑیوں کی دستیابی کی تصدیق کریں۔ شیڈول یا مقام میں تبدیلی ہو تو دونوں ٹیموں کو بروقت اطلاع دیں اور فلک کو بھی اپڈیٹ کریں۔` },
  { id: 'website-review', group: 'Website & admin', title: 'Review website updates', en: n => `Assalam-o-Alaikum ${n} bhai! Please review the latest registrations, announcements, match details, and pending records on the BJL website. Send Falak details of any incorrect or missing information. Do not make unverified changes.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم BJL ویب سائٹ پر تازہ رجسٹریشنز، اعلانات، میچ کی تفصیلات اور زیرِ التوا ریکارڈ چیک کریں۔ کوئی غلط یا غائب معلومات نظر آئے تو تفصیل کے ساتھ فلک کو بھیج دیں۔ تصدیق کے بغیر کوئی تبدیلی نہ کریں۔` },
  { id: 'end-report', group: 'Website & admin', title: 'Send end-of-day report', en: n => `Assalam-o-Alaikum ${n} bhai! At the end of today's BJL work, please send Falak a brief report covering team contacts, pending registration/payment tasks, match results, and tasks for the next day. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! آج کے BJL کام کے اختتام پر فلک کو ایک مختصر رپورٹ بھیج دیں، جس میں ٹیموں سے رابطے، رجسٹریشن/ادائیگی کے زیرِ التوا کام، میچ کے نتائج اور اگلے دن کے کام شامل ہوں۔ شکریہ۔` },
  { id: 'urgent', group: 'Website & admin', title: 'Urgent issue needs attention', en: n => `Assalam-o-Alaikum ${n} bhai! An important BJL issue needs your attention. Please check the website/Admin Dashboard and confirm the details. If it concerns payment, team status, or match schedule, verify the record first and update Falak immediately.`, ur: n => `السلام علیکم ${n} بھائی! BJL کے ایک اہم مسئلے پر آپ کی توجہ درکار ہے۔ براہِ کرم ویب سائٹ/ایڈمن ڈیش بورڈ چیک کر کے تفصیلات کی تصدیق کریں۔ اگر مسئلہ ادائیگی، ٹیم کی حیثیت یا میچ شیڈول سے متعلق ہو تو پہلے ریکارڈ چیک کریں اور فوراً فلک کو اطلاع دیں۔` }
];

export default function MembersCommunication({ teams = [] }) {
  const [recipients, setRecipients] = useState(['hasnain']);
  const [templateId, setTemplateId] = useState('meeting');
  const [language, setLanguage] = useState('ur');
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [notice, setNotice] = useState('');
  const pendingPayments = useMemo(() => teams.filter(t => t.payment !== 'verified' && t.payment !== 'rejected'), [teams]);
  const selected = MEMBERS.filter(m => recipients.includes(m.id));
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const buildMessage = member => (useCustom ? custom : template[language](member.short)).trim();
  const toggleRecipient = id => setRecipients(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  const openWhatsApp = member => {
    const message = buildMessage(member);
    if (!message) { setNotice('Please write a message first.'); return; }
    window.open('https://wa.me/' + member.phone + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
    setNotice('WhatsApp draft prepared for ' + member.name + '. Press Send yourself in WhatsApp.');
  };
  const copyMessage = async member => {
    const message = buildMessage(member);
    if (!message) { setNotice('Please write a message first.'); return; }
    try { await navigator.clipboard.writeText(message); setNotice('Message copied for ' + member.name + '.'); }
    catch (_) { setNotice('Clipboard unavailable. Please select and copy the message.'); }
  };
  return <div className="members-comms">
    <section className="card">
      <div className="admin-eyebrow">PRIVATE ADMIN WORKSPACE</div>
      <h2>👥 Members Communication</h2>
      <p>Prepare personalized BJL messages for Hasnain and Waleed in English or Urdu. Select a member, choose a template, review/edit, then open WhatsApp.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,margin:'14px 0'}}>
        {MEMBERS.map(member => <label key={member.id} style={{display:'flex',gap:10,alignItems:'center',border:'1px solid var(--line,#333)',borderRadius:12,padding:12,cursor:'pointer'}}>
          <input type="checkbox" checked={recipients.includes(member.id)} onChange={() => toggleRecipient(member.id)} style={{width:'auto'}} />
          <span><b>{member.name}</b><small style={{display:'block',opacity:.72}}>BJL Member</small></span>
        </label>)}
      </div>
      <label htmlFor="member-language">Message language / پیغام کی زبان</label>
      <select id="member-language" value={language} onChange={e => setLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="ur">اردو</option>
      </select>
      <label htmlFor="member-template">Message category / template</label>
      <select id="member-template" value={templateId} onChange={e => { setTemplateId(e.target.value); setUseCustom(false); }}>
        {['Meeting & coordination','Registration & payments','Match day','Website & admin'].map(group => <optgroup key={group} label={group}>
          {TEMPLATES.filter(t => t.group === group).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </optgroup>)}
      </select>
      <div className="row" style={{justifyContent:'flex-start',margin:'12px 0'}}>
        <button type="button" className={'btn' + (!useCustom ? '' : ' alt')} onClick={() => setUseCustom(false)}>Use ready-made message</button>
        <button type="button" className={'btn' + (useCustom ? '' : ' alt')} onClick={() => setUseCustom(true)}>✍ Custom message</button>
      </div>
      <label htmlFor="member-message">Message preview · Editable</label>
      <textarea id="member-message" dir={language === 'ur' && !useCustom ? 'rtl' : 'auto'} rows="8" style={{width:'100%',textAlign:language === 'ur' && !useCustom ? 'right' : 'left'}} value={useCustom ? custom : (selected[0] ? template[language](selected[0].short) : template[language]('Member'))} onChange={e => { setCustom(e.target.value); setUseCustom(true); }} placeholder="Write your custom message here..." />
      {useCustom ? <small>Custom text will be used as written for the selected member(s). Add each recipient's name manually if needed.</small> : <small>Recipient name and Falak's name are included automatically. {teams.length} team records are currently loaded; {pendingPayments.length} payments are unverified/pending. Verify status before taking action.</small>}
      {notice && <p role="status" className="admin-message">{notice}</p>}
      <div style={{display:'grid',gap:10,marginTop:16}}>
        {selected.length === 0 ? <p>Select Hasnain or Waleed first.</p> : selected.map(member => <article key={member.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',borderTop:'1px solid var(--line,#333)',paddingTop:12}}>
          <div><b>{member.name}</b><small style={{display:'block',opacity:.72}}>WhatsApp · +{member.phone}</small></div>
          <div className="row"><button type="button" className="btn alt" onClick={() => copyMessage(member)}>Copy</button><button type="button" className="btn" onClick={() => openWhatsApp(member)}>Open WhatsApp</button></div>
        </article>)}
      </div>
      <section style={{marginTop:20,borderTop:'1px solid var(--line,#333)',paddingTop:14}}>
        <h3>Website-based follow-up notes</h3>
        <ul>
          <li>Verify pending/unverified payments in the Admin Dashboard first.</li>
          <li>Check registration details and player records before contacting a captain.</li>
          <li>Use match-day drafts only according to the confirmed match schedule.</li>
          <li>Use the Falak-unavailable draft only when Falak is actually unavailable.</li>
        </ul>
      </section>
    </section>
  </div>;
}
