'use client';
import { useMemo, useState } from 'react';

const MEMBERS = [
  { id: 'hasnain', name: 'Muhammad Hasnain', short: 'Hasnain', phone: '923350541078' },
  { id: 'waleed', name: 'Waleed Afridi', short: 'Waleed', phone: '923145453155' }
];

const TEMPLATES = [
  { id: 'meeting', group: 'Meeting & coordination', title: 'Meeting request', en: n => `Assalam-o-Alaikum ${n} bhai! Falak would like to arrange an important meeting regarding BJL. Please share your available time so the meeting can be scheduled. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! فلک BJL کے حوالے سے ایک اہم میٹنگ کرنا چاہتے ہیں۔ براہِ کرم اپنی سہولت کے مطابق وقت بتا دیں تاکہ میٹنگ طے کی جا سکے۔ شکریہ۔` },
  { id: 'pending-teams', group: 'Registration & payments', title: 'Team registration follow-up', en: n => `Assalam-o-Alaikum ${n} bhai! Please contact the teams whose registration details are incomplete. Collect the missing information and send the complete details to Falak for review. Do not confirm any team yourself. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم اُن ٹیموں سے رابطہ کریں جن کی رجسٹریشن کی معلومات نامکمل ہیں۔ باقی معلومات حاصل کر کے مکمل تفصیل فلک کو بھیج دیں تاکہ وہ جائزہ لے سکیں۔ کسی ٹیم کو اپنی طرف سے کنفرم نہ کریں۔ شکریہ۔` },
  { id: 'payment', group: 'Registration & payments', title: 'Payment information follow-up', en: n => `Assalam-o-Alaikum ${n} bhai! Please contact the relevant team and collect clear payment proof and transaction details. Send the screenshot and details directly to Falak. Final payment verification will be handled by Falak. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم متعلقہ ٹیم سے رابطہ کر کے ادائیگی کا واضح ثبوت اور ٹرانزیکشن کی تفصیلات حاصل کریں۔ اسکرین شاٹ اور مکمل معلومات براہِ راست فلک کو بھیج دیں۔ ادائیگی کی حتمی تصدیق فلک خود کریں گے۔ شکریہ۔` },
  { id: 'registration', group: 'Registration & payments', title: 'Registration details collection', en: n => `Assalam-o-Alaikum ${n} bhai! Please collect any missing team information, player names, contact numbers, and required documents. Send the complete details to Falak for review. Please do not approve or change any official record.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم ٹیم کی نامکمل معلومات، کھلاڑیوں کے نام، رابطہ نمبرز اور ضروری دستاویزات حاصل کریں۔ مکمل تفصیلات فلک کو جائزے کے لیے بھیج دیں۔ کسی سرکاری ریکارڈ میں خود سے منظوری یا تبدیلی نہ کریں۔` },
  { id: 'ground-time', group: 'Match day', title: 'Reach the ground on time', en: n => `Assalam-o-Alaikum ${n} bhai! Please reach Dab Ground before the confirmed BJL match time. Help with the ground arrangements and guide the teams so the match can start on time. Inform Falak if you face any delay. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم BJL میچ کے طے شدہ وقت سے پہلے ڈب گراؤنڈ پہنچ جائیں۔ گراؤنڈ کے انتظامات اور ٹیموں کی رہنمائی میں مدد کریں تاکہ میچ وقت پر شروع ہو سکے۔ تاخیر کی صورت میں فلک کو اطلاع دیں۔ شکریہ۔` },
  { id: 'falak-absent', group: 'Match day', title: 'Falak unavailable today', en: n => `Assalam-o-Alaikum ${n} bhai! Falak will not be present at the ground during today's match. Please help manage the match arrangements, team coordination, and necessary announcements. Send all important updates and the match report directly to Falak. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! آج فلک میچ کے وقت گراؤنڈ میں موجود نہیں ہوں گے۔ براہِ کرم میچ کے انتظامات، ٹیموں سے رابطے اور ضروری اعلانات میں مدد کریں۔ تمام اہم اپڈیٹس اور میچ کی رپورٹ براہِ راست فلک کو بھیج دیں۔ شکریہ۔` },
  { id: 'match-duty', group: 'Match day', title: 'Handle match arrangements', en: n => `Assalam-o-Alaikum ${n} bhai! Please coordinate both teams' attendance, overs, umpire/scorer arrangements, and match result details. Send the final score and important match information directly to Falak after the match.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم دونوں ٹیموں کی حاضری، اوورز، امپائر/اسکورر کے انتظامات اور میچ کے نتیجے کی تفصیلات دیکھ لیں۔ میچ کے بعد فائنل اسکور اور اہم معلومات براہِ راست فلک کو بھیج دیں۔` },
  { id: 'team-coordination', group: 'Match day', title: 'Coordinate with both teams', en: n => `Assalam-o-Alaikum ${n} bhai! Please contact both team captains and confirm their arrival and player availability. If the schedule or venue changes, inform both teams promptly and update Falak directly.`, ur: n => `السلام علیکم ${n} بھائی! براہِ کرم دونوں ٹیموں کے کپتانوں سے رابطہ کر کے ان کی آمد اور کھلاڑیوں کی دستیابی کی تصدیق کریں۔ شیڈول یا مقام میں تبدیلی ہو تو دونوں ٹیموں کو بروقت اطلاع دیں اور فلک کو براہِ راست آگاہ کریں۔` },
  { id: 'website-review', group: 'Website & admin', title: 'Send website corrections', en: n => `Assalam-o-Alaikum ${n} bhai! If you notice any incorrect team name, player detail, announcement, or match information on the BJL website, take a screenshot and send it to Falak. Please do not try to edit website or admin records yourself.`, ur: n => `السلام علیکم ${n} بھائی! اگر BJL ویب سائٹ پر ٹیم کے نام، کھلاڑیوں کی تفصیل، اعلان یا میچ کی معلومات میں کوئی غلطی نظر آئے تو اس کا اسکرین شاٹ لے کر فلک کو بھیج دیں۔ ویب سائٹ یا ایڈمن ریکارڈ میں خود سے ترمیم نہ کریں۔` },
  { id: 'end-report', group: 'Website & admin', title: 'Send end-of-day report', en: n => `Assalam-o-Alaikum ${n} bhai! At the end of today's BJL work, please send Falak a brief update covering team contacts, registration or payment information collected, match results, and any pending tasks. Thank you.`, ur: n => `السلام علیکم ${n} بھائی! آج کے BJL کام کے اختتام پر فلک کو مختصر اپڈیٹ بھیج دیں، جس میں ٹیموں سے رابطے، رجسٹریشن یا ادائیگی سے متعلق حاصل کردہ معلومات، میچ کے نتائج اور باقی کام شامل ہوں۔ شکریہ۔` },
  { id: 'urgent', group: 'Website & admin', title: 'Urgent issue needs attention', en: n => `Assalam-o-Alaikum ${n} bhai! An important BJL issue needs attention. Please collect the relevant details or screenshot and send them directly to Falak as soon as possible. Falak will review and handle any official website, dashboard, or record changes.`, ur: n => `السلام علیکم ${n} بھائی! BJL کے ایک اہم مسئلے پر توجہ درکار ہے۔ براہِ کرم متعلقہ تفصیلات یا اسکرین شاٹ حاصل کر کے جلد از جلد براہِ راست فلک کو بھیج دیں۔ ویب سائٹ، ڈیش بورڈ یا آفیشل ریکارڈ میں تبدیلی فلک خود دیکھیں گے۔` }
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
      <p>Prepare BJL coordination messages for Hasnain and Waleed in English or Urdu. Members can send updates and screenshots directly to Falak. All dashboard access and official record changes remain with Falak.</p>
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
        <h3>Private admin notes</h3>
        <ul>
          <li>Dashboard access and all official status changes are handled by Falak only.</li>
          <li>Members should collect information and send it directly to Falak. They do not need to access the dashboard.</li>
          <li>Only share match timings and arrangements after they are confirmed.</li>
          <li>Keep all website edits, dashboard updates, approvals, and final confirmations under Falak's control.</li>
        </ul>
      </section>
    </section>
  </div>;
}
