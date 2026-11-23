'use client';
import { useMemo, useState } from 'react';

const MEMBERS = [
  { id: 'hasnain', name: 'Muhammad Hasnain', short: 'Hasnain', phone: '923350541078' },
  { id: 'waleed', name: 'Waleed Afridi', short: 'Waleed', phone: '923145453155' }
];

const TEMPLATES = [
  { id: 'meeting', group: 'Meeting & coordination', title: 'Falak wants a meeting', text: n => `Assalam-o-Alaikum ${n} bhai! Aap ke bhai Falak ki taraf se paigham hai. Falak aap se BJL ke hawale se ek zaroori meeting karna chahte hain. Barah-e-karam apni availability bata dein taa-ke meeting ka waqt final kiya ja sake. Shukriya.` },
  { id: 'pending-teams', group: 'Registration & payments', title: 'Pending team follow-up', text: n => `Assalam-o-Alaikum ${n} bhai! BJL website par teams ki registration aur payment entries review karni hain. Barah-e-karam Admin Dashboard mein pending cases check kar ke unki tasdeeq karein. Kisi team ko confirmed kehne se pehle record verify zaroor karein aur Falak ko update dein. Shukriya.` },
  { id: 'payment', group: 'Registration & payments', title: 'Payment verification reminder', text: n => `Assalam-o-Alaikum ${n} bhai! BJL ki pending payments ko website ke Admin Dashboard mein review karna hai. Har team ki transaction details aur screenshot check karein. Sirf tasdeeq ke baad payment verify karein. Agar koi masla ho to Falak ko bata dein.` },
  { id: 'registration', group: 'Registration & payments', title: 'Registration details check', text: n => `Assalam-o-Alaikum ${n} bhai! Meherbani kar ke BJL website par team registrations check kar lein. Jis team ki information, players ya documents incomplete hon, uski list bana kar Falak ko bhej dein. Kisi entry ko apni taraf se approve na karein jab tak details confirm na hon.` },
  { id: 'ground-time', group: 'Match day', title: 'Reach the ground on time', text: n => `Assalam-o-Alaikum ${n} bhai! BJL match ke liye barah-e-karam muqarrara waqt se pehle Dab Ground pohanch jayein. Ground aur match arrangements check kar lein taa-ke teams ko intezar na karna pade. Agar dair ho to foran Falak ko inform karein.` },
  { id: 'falak-absent', group: 'Match day', title: 'Falak unavailable today', text: n => `Assalam-o-Alaikum ${n} bhai! Aaj Falak match ke waqt ground par mojood nahi honge. Unki taraf se request hai ke aap BJL ke match arrangements, teams ki coordination aur zaroori announcements sambhal lein. Har important update ka record rakhein aur Falak ko baad mein report dein. Shukriya.` },
  { id: 'match-duty', group: 'Match day', title: 'Handle match arrangements', text: n => `Assalam-o-Alaikum ${n} bhai! Aaj ke match ke liye dono teams ki attendance, overs, umpire/scorer coordination aur result entry par tawajjo dein. Match ke baad result aur zaroori details Falak ko bhej dein.` },
  { id: 'team-coordination', group: 'Match day', title: 'Coordinate with both teams', text: n => `Assalam-o-Alaikum ${n} bhai! Barah-e-karam match mein shamil dono teams ke captains se rabta kar ke arrival aur player availability confirm karein. Schedule ya venue mein tabdeeli ho to dono teams ko waqt par inform karein aur Falak ko update dein.` },
  { id: 'website-review', group: 'Website & admin', title: 'Review website updates', text: n => `Assalam-o-Alaikum ${n} bhai! BJL website par latest registrations, announcements, match details aur pending records review kar lein. Agar koi ghalat ya missing information nazar aaye to details ke sath Falak ko bhej dein. Bina tasdeeq koi tabdeeli na karein.` },
  { id: 'end-report', group: 'Website & admin', title: 'Send end-of-day report', text: n => `Assalam-o-Alaikum ${n} bhai! Aaj ke BJL kaam ke baad Falak ko chhoti si report bhej dein: teams se rabta, registration/payment mein pending kaam, match result aur aglay din ke tasks. Shukriya.` },
  { id: 'urgent', group: 'Website & admin', title: 'Urgent issue needs attention', text: n => `Assalam-o-Alaikum ${n} bhai! BJL ke ek zaroori maslay par aapki tawajjo darkar hai. Barah-e-karam website/Admin Dashboard check kar ke issue ki details confirm karein. Payment, team status ya match schedule ka masla ho to pehle record verify karein aur foran Falak ko update dein.` }
];

export default function MembersCommunication({ teams = [] }) {
  const [recipients, setRecipients] = useState(['hasnain']);
  const [templateId, setTemplateId] = useState('meeting');
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [notice, setNotice] = useState('');
  const pendingPayments = useMemo(() => teams.filter(t => t.payment !== 'verified' && t.payment !== 'rejected'), [teams]);
  const selected = MEMBERS.filter(m => recipients.includes(m.id));
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const buildMessage = member => (useCustom ? custom : template.text(member.short)).trim();
  const toggleRecipient = id => setRecipients(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  const openWhatsApp = member => {
    const message = buildMessage(member);
    if (!message) { setNotice('Pehle message likhein.'); return; }
    window.open('https://wa.me/' + member.phone + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
    setNotice(member.name + ' ke liye WhatsApp draft tayyar hai. Send aap WhatsApp mein khud press karein.');
  };
  const copyMessage = async member => {
    const message = buildMessage(member);
    if (!message) { setNotice('Pehle message likhein.'); return; }
    try { await navigator.clipboard.writeText(message); setNotice(member.name + ' ka message copy ho gaya.'); }
    catch (_) { setNotice('Clipboard available nahi. Message select karke copy karein.'); }
  };
  return <div className="members-comms">
    <section className="card">
      <div className="admin-eyebrow">PRIVATE ADMIN WORKSPACE</div>
      <h2>👥 Members Communication</h2>
      <p>Falak ki taraf se Hasnain aur Waleed ke liye ready-made reminders. Member select karein, topic choose karein aur message preview/edit karke WhatsApp kholein.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,margin:'14px 0'}}>
        {MEMBERS.map(member => <label key={member.id} style={{display:'flex',gap:10,alignItems:'center',border:'1px solid var(--line,#333)',borderRadius:12,padding:12,cursor:'pointer'}}>
          <input type="checkbox" checked={recipients.includes(member.id)} onChange={() => toggleRecipient(member.id)} style={{width:'auto'}} />
          <span><b>{member.name}</b><small style={{display:'block',opacity:.72}}>BJL Member</small></span>
        </label>)}
      </div>
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
      <textarea id="member-message" rows="8" style={{width:'100%'}} value={useCustom ? custom : (selected[0] ? template.text(selected[0].short) : template.text('Member'))} onChange={e => { setCustom(e.target.value); setUseCustom(true); }} placeholder="Yahan apna custom message likhein..." />
      {useCustom ? <small>Custom text selected member(s) ke liye use hoga. Personal naam add karna ho to message mein khud likhein.</small> : <small>Recipient ka naam aur Falak ka naam automatically shamil hota hai. Website par is waqt {teams.length} teams ka record loaded hai aur {pendingPayments.length} payments unverified/pending hain. Status verify karke hi action lein.</small>}
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
          <li>Pending/unverified payments ko pehle Admin Dashboard mein verify karein.</li>
          <li>Team registration details aur player records check karne ke baad hi captain se rabta karein.</li>
          <li>Match-day drafts ko sirf confirmed match schedule ke mutabiq use karein.</li>
          <li>Falak absence draft sirf us din use karein jab Falak waqai available na hon.</li>
        </ul>
      </section>
    </section>
  </div>;
}
