'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminSupabase as supabase } from '../lib/adminSupabase';

const cleanPhone = value => {
  let n = String(value || '').replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '92' + n.slice(1);
  if (n.length === 10 && n.startsWith('3')) n = '92' + n;
  return n;
};
const fmt = value => value ? new Date(value).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set';
const dateOnly = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-PK', { dateStyle: 'long' }) : 'Date not set';

export default function WhatsAppAutomation({ teams = [], objections = [] }) {
  const [queue, setQueue] = useState([]);
  const [matches, setMatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('all');
  const [ground, setGround] = useState('Dab Ground, Battagram');
  const [reporting, setReporting] = useState('30 minutes before match');
  const [targetTeam, setTargetTeam] = useState('');
  const [targetContact, setTargetContact] = useState('captain1');
  const [targetMember, setTargetMember] = useState('');
  const [language, setLanguage] = useState('en');
  const [memberContacts, setMemberContacts] = useState({aman:'',waleed:'',m_hasnain:''});
  const [messageKind, setMessageKind] = useState('custom');
  const [customText, setCustomText] = useState('');
  const [composerBusy, setComposerBusy] = useState(false);
  const signature = '\n\nFrom: Falak\nAdmin | Organizer\n[BJL-01]';
  const selectedTeam = teams.find(t => t.id === targetTeam);
  const selectedCaptain = (selectedTeam?.players || []).find(p => p.id === selectedTeam?.captain_id);
  const selectedVice = (selectedTeam?.players || []).find(p => p.id === selectedTeam?.vice_captain_id);
  const memberNames = { aman:'Aman', waleed:'Waleed', m_hasnain:'M. Hasnain' };
  const selectedPeople = targetContact === 'members' ? [{name:memberNames[targetMember],mobile:memberContacts[targetMember]}].filter(x=>x.name && x.mobile) :
    targetContact === 'both' ? [{name:selectedCaptain?.name || 'Captain 1',mobile:selectedCaptain?.mobile},{name:selectedVice?.name || 'Captain 2',mobile:selectedVice?.mobile}].filter(x=>x.mobile) :
    targetContact === 'captain2' ? [{name:selectedVice?.name || 'Captain 2',mobile:selectedVice?.mobile}] :
    [{name:selectedCaptain?.name || 'Captain 1',mobile:selectedCaptain?.mobile}].filter(x=>x.mobile);
  const selectedMobile = selectedPeople.map(x=>x.mobile).filter(Boolean).join(' / ');
  const selectedName = selectedPeople.map(x=>x.name).join(', ');
  useEffect(() => { (async()=>{ const {data}=await supabase.from('bjl_member_contacts').select('*'); if(data?.length) setMemberContacts(Object.fromEntries(data.map(x=>[x.member_key,x.mobile]))); })(); }, []);
  const saveMemberContact = async (key, mobile) => { setMemberContacts(v=>({...v,[key]:mobile})); const {error}=await supabase.from('bjl_member_contacts').upsert({member_key:key,display_name:memberNames[key],mobile,updated_at:new Date().toISOString()},{onConflict:'member_key'}); setNotice(error?'Could not save contact: '+error.message:'BJL member contact saved.'); };

  const loadQueue = useCallback(async () => {
    const { data, error } = await supabase.from('whatsapp_message_queue').select('*').order('due_at', { ascending: true }).limit(250);
    if (error) setNotice('Queue load error: ' + error.message);
    else setQueue(data || []);
  }, []);

  const loadMatches = useCallback(async () => {
    const { data, error } = await supabase.from('matches').select('*').gte('match_date', new Date().toISOString().slice(0,10)).order('match_date');
    if (error) { setNotice('Match load error: ' + error.message); return; }
    const rows = data || [];
    const ids = [...new Set(rows.flatMap(m => [m.team_a, m.team_b]).filter(Boolean))];
    const [{ data: teamRows }, { data: playerRows }] = await Promise.all([
      ids.length ? supabase.from('teams').select('id,name,captain_id,vice_captain_id,manager_mobile').in('id', ids) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('players').select('id,name,mobile,team_id').in('team_id', ids) : Promise.resolve({ data: [] })
    ]);
    const teamMap = Object.fromEntries((teamRows || []).map(t => [t.id, t]));
    const playerMap = Object.fromEntries((playerRows || []).map(p => [p.id, p]));
    setMatches(rows.map(m => ({ ...m, a: teamMap[m.team_a], b: teamMap[m.team_b], ap: playerMap[teamMap[m.team_a]?.captain_id], bp: playerMap[teamMap[m.team_b]?.captain_id] })));
  }, []);

  const schedulePaymentReminders = useCallback(async () => {
    const eligible = teams.filter(t => !['verified','submitted'].includes(t.payment) && t.created_at);
    if (!eligible.length) return;
    const { data: existing, error } = await supabase.from('whatsapp_message_queue').select('team_id,due_at').eq('message_type','payment_reminder').neq('status','cancelled');
    if (error) { setNotice('Reminder check error: ' + error.message); return; }
    const have = new Set((existing || []).map(x => x.team_id + '|' + new Date(x.due_at).toISOString()));
    const now = Date.now();
    const inserts = [];
    for (const team of eligible) {
      const captain = (team.players || []).find(p => p.id === team.captain_id);
      const mobile = captain?.mobile || team.manager_mobile;
      if (!mobile) continue;
      const start = new Date(team.created_at).getTime();
      for (let hours = 0; hours <= 48; hours += 12) {
        const due = new Date(start + hours * 3600000);
        if (due.getTime() > now) continue;
        if (have.has(team.id + '|' + due.toISOString())) continue;
        const text = `Assalam-o-Alaikum ${captain?.name || team.manager_name || 'Captain'}! BJL registration fee for team "${team.name}" is still pending. Please submit your payment proof to confirm your team's registration. If you have already submitted proof, please ignore this reminder. - Battagram Junior League`;
        inserts.push({ message_type:'payment_reminder', team_id:team.id, recipient_name:captain?.name || team.manager_name || team.name, recipient_mobile:mobile, message_text:text, due_at:due.toISOString() });
      }
    }
    if (inserts.length) {
      const { error: insertError } = await supabase.from('whatsapp_message_queue').insert(inserts);
      if (insertError) setNotice('Could not create reminders: ' + insertError.message);
    }
  }, [teams]);

  useEffect(() => {
    let active = true;
    (async () => {
      setBusy(true);
      await Promise.all([loadQueue(), loadMatches()]);
      if (active) setBusy(false);
    })();
    return () => { active = false; };
  }, [loadQueue, loadMatches]);

  useEffect(() => {
    if (!teams.length) return;
    schedulePaymentReminders().then(loadQueue);
  }, [teams, schedulePaymentReminders, loadQueue]);

  const createMessage = async row => {
    const phone = cleanPhone(row.recipient_mobile);
    if (phone.length < 11) { setNotice('Invalid mobile number for ' + (row.recipient_name || 'recipient')); return; }
    const finalText = row.message_text.includes('From: Falak\nAdmin | Organizer\n[BJL-01]') ? row.message_text : row.message_text.trim() + signature;
    const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(finalText);
    if (finalText !== row.message_text) await supabase.from('whatsapp_message_queue').update({ message_text: finalText, updated_at: new Date().toISOString() }).eq('id', row.id);
    const { error } = await supabase.from('whatsapp_message_queue').update({ status:'opened', opened_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id',row.id);
    if (error) { setNotice(error.message); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
    setNotice('WhatsApp opened. Review the text and press Send inside WhatsApp.');
    loadQueue();
  };

  const createCustomMessage = async e => {
    e.preventDefault();
    if (targetContact !== 'members' && !selectedTeam) return setNotice('Please select a team first.');
    if (!selectedPeople.length) return setNotice('No mobile number is saved for the selected recipient.');
    const templates = {
      payment_reminder: language==='ur' ? 'السلام علیکم! براہِ کرم اپنی ٹیم کی رجسٹریشن فیس جمع کروا کر ادائیگی کا ثبوت ارسال کریں۔ اگر آپ پہلے ہی جمع کروا چکے ہیں تو اس پیغام کو نظر انداز کریں۔' : 'Assalam-o-Alaikum! Please submit your team registration fee and share the payment proof. If you have already submitted it, kindly ignore this message.',
      match_reminder: language==='ur' ? 'السلام علیکم! آپ کی ٹیم کے میچ کے بارے میں اطلاع ہے۔ براہِ کرم مقررہ وقت سے پہلے گراؤنڈ پہنچیں اور انتظامیہ کی ہدایات پر عمل کریں۔' : 'Assalam-o-Alaikum! This is an update about your team match. Please arrive at the ground before the scheduled time and follow the organizers’ instructions.',
      objection_notice: language==='ur' ? 'السلام علیکم! آپ کی ٹیم کے ایک کھلاڑی کے حوالے سے اعتراض موصول ہوا ہے۔ براہِ کرم وضاحت اور ضروری کارروائی کے لیے انتظامیہ سے رابطہ کریں۔' : 'Assalam-o-Alaikum! An objection has been received regarding a player from your team. Please contact the organizers for clarification and necessary action.',
      custom: ''
    };
    const body = customText.trim() || templates[messageKind];
    if (!body) return setNotice('Write a custom message or choose an automatic template.');
    setComposerBusy(true);
    const inserts = selectedPeople.map(person=>({message_type:messageKind,team_id:selectedTeam?.id || null,recipient_name:person.name,recipient_mobile:person.mobile,message_text:body+signature,due_at:new Date().toISOString()}));
    const {error}=await supabase.from('whatsapp_message_queue').insert(inserts);
    setComposerBusy(false);
    if(error) return setNotice('Message could not be prepared: '+error.message);
    setCustomText('');
    setNotice('Prepared '+inserts.length+' message(s) for '+selectedName+'. Open each and press Send in WhatsApp.');
    await loadQueue();
  };

  const markSent = async row => {
    const { error } = await supabase.from('whatsapp_message_queue').update({ status:'sent', sent_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id',row.id);
    setNotice(error ? error.message : 'Marked as sent. Please only do this after sending in WhatsApp.');
    if (!error) loadQueue();
  };

  const saveEdit = async row => {
    if (!draft.trim()) return setNotice('Message cannot be empty.');
    const { error } = await supabase.from('whatsapp_message_queue').update({ message_text:draft.trim(), updated_at:new Date().toISOString() }).eq('id',row.id);
    setNotice(error ? error.message : 'Message updated.');
    setEditing(null);
    if (!error) loadQueue();
  };

  const addMatchMessages = async match => {
    const when = `${dateOnly(match.match_date)} at ${match.match_time || 'time to be confirmed'}`;
    const rows = [
      { team:match.a, captain:match.ap },
      { team:match.b, captain:match.bp }
    ].filter(x => x.team && (x.captain?.mobile || x.team.manager_mobile));
    if (!rows.length) return setNotice('No captain/manager mobile numbers found for this match.');
    const inserts = rows.map(({team,captain}) => ({
      message_type:'match_reminder', team_id:team.id, match_id:match.id,
      recipient_name:captain?.name || team.name, recipient_mobile:captain?.mobile || team.manager_mobile,
      due_at:new Date().toISOString(),
      message_text:`Assalam-o-Alaikum ${captain?.name || 'Captain'}! Match reminder from Battagram Junior League. Your team "${team.name}" is scheduled to play "${team.id === match.team_a ? match.b?.name : match.a?.name || 'opponent'}" on ${when}. Ground: ${ground}. Reporting: ${reporting}. Please arrive on time. - BJL Management`
    }));
    const { error } = await supabase.from('whatsapp_message_queue').insert(inserts);
    setNotice(error ? error.message : 'Match reminders created for both team captains.');
    if (!error) loadQueue();
  };

  const addObjectionMessages = async objection => {
    const team = teams.find(t => t.id === objection.team_id);
    if (!team) return setNotice('Affected team was not found.');
    const captain = (team.players || []).find(p => p.id === team.captain_id);
    const mobile = captain?.mobile || team.manager_mobile;
    if (!mobile) return setNotice('No captain/manager mobile number is available.');
    const text = `Assalam-o-Alaikum ${captain?.name || 'Captain'}! A player objection has been recorded for your team "${team.name}". Player: ${objection.players?.name || 'Player'}. Reason: ${objection.reason || 'Not specified'}. Details: ${objection.details || 'Please contact BJL management for details.'}. Please contact tournament management for clarification. - BJL Management`;
    const { error } = await supabase.from('whatsapp_message_queue').insert({ message_type:'objection_notice', team_id:team.id, recipient_name:captain?.name || team.name, recipient_mobile:mobile, message_text:text, due_at:new Date().toISOString() });
    setNotice(error ? error.message : 'Objection notification created for affected team captain.');
    if (!error) loadQueue();
  };

  const visible = useMemo(() => queue.filter(x => filter === 'all' || x.status === filter), [queue,filter]);
  const counts = useMemo(() => ({ pending:queue.filter(x=>x.status==='pending').length, opened:queue.filter(x=>x.status==='opened').length, sent:queue.filter(x=>x.status==='sent').length }),[queue]);

  return <div className="wa-automation">
    <style>{`
      .wa-automation{display:grid;gap:16px;color:#243247}.wa-automation .wa-card{background:#ffffff;color:#243247;border:1px solid #dce4ee;border-radius:14px;padding:16px}.wa-automation h2,.wa-automation h3{margin:0 0 10px}.wa-automation p{opacity:.8}.wa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.wa-stat{padding:13px;border-radius:10px;background:#f1f5f9;color:#243247}.wa-stat b{display:block;font-size:24px}.wa-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.wa-actions button,.wa-automation button{cursor:pointer}.wa-muted{font-size:13px;opacity:.72}.wa-row{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}.wa-automation textarea,.wa-automation input,.wa-automation select{width:100%;padding:10px;border-radius:8px;border:1px solid var(--border,rgba(255,255,255,.2));background:#f8fafc;color:#243247;border-color:#cbd5e1}.wa-item{border-top:1px solid #e2e8f0;padding:14px 0}.wa-tag{font-size:11px;border-radius:20px;padding:4px 8px;background:#e2e8f0;color:#243247}.wa-primary{background:#167c49!important;color:white!important}.wa-automation .btn{margin:2px}.wa-automation label{display:block;margin:8px 0 4px}@media(max-width:600px){.wa-automation .wa-card{padding:12px}}`}</style>
    <div className="wa-card"><div className="wa-row"><div><h2>WhatsApp Automation</h2><p className="wa-muted">Free manual-send workflow. Messages are prepared here and sent only after you confirm inside WhatsApp Business.</p></div><button className="btn alt" onClick={()=>{loadQueue();loadMatches();}}>↻ Refresh</button></div>
      <div className="wa-grid"><div className="wa-stat"><b>{counts.pending}</b><span>Pending</span></div><div className="wa-stat"><b>{counts.opened}</b><span>Opened in WhatsApp</span></div><div className="wa-stat"><b>{counts.sent}</b><span>Marked sent</span></div></div>
      <p className="wa-muted">Payment schedule: at registration and every 12 hours up to 48 hours. Pauses after payment proof is submitted and stops after verification. Schedule checks when this dashboard is opened/refreshed, not while it is closed.</p>
      {notice && <p role="status">{notice}</p>}
    </div>
    <div className="wa-card"><h3>✉ Create a message</h3>
      <p className="wa-muted">For teams, messages go only to Captain 1 and/or Captain 2. You can also message the three BJL members separately.</p>
      <form onSubmit={createCustomMessage}>
        <label>Recipient Category</label><select value={targetContact} onChange={e=>setTargetContact(e.target.value)}><option value="captain1">Team Captain 1</option><option value="captain2">Team Captain 2</option><option value="both">Both Captains (1 & 2)</option><option value="members">BJL Members</option></select>
        {targetContact==='members' ? <>
          <label>Select BJL Member</label><select value={targetMember} onChange={e=>setTargetMember(e.target.value)}><option value="">Choose member...</option><option value="aman">Aman</option><option value="waleed">Waleed</option><option value="m_hasnain">M. Hasnain</option></select>
          <label>Member WhatsApp Number</label><input value={memberContacts[targetMember]||''} onChange={e=>setMemberContacts(v=>({...v,[targetMember]:e.target.value}))} onBlur={e=>targetMember && saveMemberContact(targetMember,e.target.value)} placeholder="03XXXXXXXXX" />
          <p className="wa-muted">Numbers were not publicly verified online. Enter each member’s confirmed number once; it will be saved for future messages.</p>
        </> : <>
          <label>Select Team</label><select value={targetTeam} onChange={e=>setTargetTeam(e.target.value)} required><option value="">Choose a team...</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name} · {t.reg_id || ''}</option>)}</select>
          <p className="wa-muted">Selected recipient(s): <b>{selectedName || 'Not selected'}</b><br/>WhatsApp number(s): <b>{selectedMobile || 'Not available'}</b></p>
        </>}
        <label>Message Language</label><select value={language} onChange={e=>setLanguage(e.target.value)}><option value="en">English</option><option value="ur">Urdu</option></select>
        <label>Message Type / Automatic Template</label><select value={messageKind} onChange={e=>setMessageKind(e.target.value)}><option value="custom">Custom Message</option><option value="payment_reminder">Fee / Payment Reminder</option><option value="match_reminder">Match Information</option><option value="objection_notice">Player Objection Notice</option></select>
        <label>{messageKind==='custom'?'Write Custom Message':'Optional: edit/add to the automatic message'}</label><textarea rows="5" value={customText} onChange={e=>setCustomText(e.target.value)} placeholder={messageKind==='custom'?'Write your message...':'Leave blank to use the selected automatic template, or type your own version.'} />
        <div className="wa-muted" style={{background:'#f1f5f9',padding:12,borderRadius:8,whiteSpace:'pre-wrap'}}>Automatic signature:{signature}</div>
        <div className="wa-actions"><button className="btn wa-primary" disabled={composerBusy || (targetContact!=='members'&&!selectedTeam) || !selectedPeople.length}>{composerBusy?'Preparing...':'Prepare Message(s)'}</button></div>
      </form>
    </div>
    <div className="wa-card"><h3>Upcoming match reminders</h3><div className="wa-grid"><div><label>Ground / Venue</label><input value={ground} onChange={e=>setGround(e.target.value)} /></div><div><label>Reporting time</label><input value={reporting} onChange={e=>setReporting(e.target.value)} /></div></div>
      {matches.length===0 && <p className="wa-muted">No upcoming matches found in the matches table.</p>}
      {matches.map(m=><div className="wa-item" key={m.id}><b>{m.a?.name || 'Team A'} vs {m.b?.name || 'Team B'}</b><p className="wa-muted">{dateOnly(m.match_date)} · {m.match_time || 'Time TBC'}</p><button className="btn wa-primary" onClick={()=>addMatchMessages(m)}>Prepare captain reminders</button></div>)}
    </div>
    <div className="wa-card"><h3>Open player objections</h3>
      {objections.filter(o=>o.status==='open').length===0 && <p className="wa-muted">No open objections.</p>}
      {objections.filter(o=>o.status==='open').map(o=><div className="wa-item" key={o.id}><b>{o.players?.name || 'Player'} · {o.teams?.name || 'Team'}</b><p className="wa-muted">{o.reason} · {fmt(o.created_at)}</p><button className="btn alt" onClick={()=>addObjectionMessages(o)}>Prepare captain notification</button></div>)}
    </div>
    <div className="wa-card"><div className="wa-row"><h3>Message queue & history</h3><select style={{maxWidth:180}} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All messages</option><option value="pending">Pending</option><option value="opened">Opened</option><option value="sent">Sent</option><option value="cancelled">Cancelled</option></select></div>
      {busy && <p>Loading...</p>}
      {visible.length===0 && <p className="wa-muted">No messages in this view yet.</p>}
      {visible.map(row=><article className="wa-item" key={row.id}>
        <div className="wa-row"><div><b>{row.recipient_name || 'Recipient'}</b><p className="wa-muted">{row.recipient_mobile} · {row.message_type.replaceAll('_',' ')} · Due {fmt(row.due_at)}</p></div><span className="wa-tag">{row.status.toUpperCase()}</span></div>
        {editing===row.id ? <><textarea rows="5" value={draft} onChange={e=>setDraft(e.target.value)} /><div className="wa-actions"><button className="btn" onClick={()=>saveEdit(row)}>Save message</button><button className="btn alt" onClick={()=>setEditing(null)}>Cancel</button></div></> : <><p style={{whiteSpace:'pre-wrap'}}>{row.message_text}</p><div className="wa-actions"><button className="btn" onClick={()=>{setEditing(row.id);setDraft(row.message_text);}}>Edit</button><button className="btn wa-primary" onClick={()=>createMessage(row)}>Send on WhatsApp</button>{row.status!=='sent' && <button className="btn alt" onClick={()=>markSent(row)}>Mark as sent</button>}</div></>}
      </article>)}
    </div>
  </div>;
}
