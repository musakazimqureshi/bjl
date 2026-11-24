'use client';
import { useMemo, useState } from 'react';
import { shrink } from '../lib/img';

const POSITIONS = [
  ['batter', 'Batter'],
  ['bowler', 'Bowler'],
  ['all_rounder', 'All-Rounder'],
  ['wicket_keeper', 'Wicket-Keeper']
];
const MOBILE = /^(03\\d{9}|\\+923\\d{9})$/;

export default function PlayerRosterEditor({ teams = [], supabase, onUpdated }) {
  const [teamId, setTeamId] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ name: '', mobile: '', age: '', position: '', file: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const team = teams.find(item => String(item.id) === String(teamId));
  const players = useMemo(() => (team?.players || []).slice().sort((a, b) => Number(a.seq) - Number(b.seq)), [team]);
  const filteredTeams = teams.filter(item => (item.name + ' ' + (item.reg_id || '')).toLowerCase().includes(query.toLowerCase()));

  function beginEdit(player) {
    setEditing(player.id);
    setDraft({ name: player.name || '', mobile: player.mobile || '', age: String(player.age || ''), position: player.position || '', file: null });
    setNotice('');
  }
  function cancelEdit() {
    setEditing(null);
    setDraft({ name: '', mobile: '', age: '', position: '', file: null });
  }
  async function savePlayer(event, player, index) {
    event.preventDefault();
    setNotice('');
    const name = draft.name.trim();
    const age = Number(draft.age);
    if (!name || !Number.isInteger(age) || age < 5 || age > 60 || !POSITIONS.some(([value]) => value === draft.position)) {
      setNotice('Name, valid age (5–60), and playing role are required.');
      return;
    }
    if (index < 2 && !MOBILE.test(draft.mobile.trim())) {
      setNotice('Captain mobile must be a valid Pakistani mobile number.');
      return;
    }
    if (index === 0 && draft.mobile.trim() === players[1]?.mobile) {
      setNotice('Captain 1 and Captain 2 must have different mobile numbers.');
      return;
    }
    if (index === 1 && draft.mobile.trim() === players[0]?.mobile) {
      setNotice('Captain 1 and Captain 2 must have different mobile numbers.');
      return;
    }
    if (draft.file && (!['image/jpeg', 'image/png', 'image/webp'].includes(draft.file.type) || draft.file.size > 15 * 1024 * 1024)) {
      setNotice('Photo must be JPG, PNG or WEBP and no larger than 15 MB.');
      return;
    }
    setBusy(true);
    let uploadedPath = '';
    try {
      let photoPath = player.photo_path;
      if (draft.file) {
        uploadedPath = `${team.id}/replacement-${player.id}-${Date.now()}.jpg`;
        const blob = await shrink(draft.file, 900);
        const { error: uploadError } = await supabase.storage.from('player-photos').upload(uploadedPath, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        photoPath = uploadedPath;
      }
      const { error } = await supabase.from('players').update({
        name,
        mobile: index < 2 ? draft.mobile.trim() : null,
        age,
        position: draft.position,
        photo_path: photoPath
      }).eq('id', player.id).eq('team_id', team.id);
      if (error) throw error;
      setNotice(`${name} updated successfully. Team roster remains at ${players.length} players.`);
      cancelEdit();
      await onUpdated?.();
    } catch (error) {
      if (uploadedPath) await supabase.storage.from('player-photos').remove([uploadedPath]);
      setNotice('Player was not updated: ' + (error?.message || 'Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="player-roster-manager">
      <div className="card">
        <span className="admin-eyebrow">ADMIN ONLY · REGISTERED SQUADS</span>
        <h2>Player Replacement & Editing</h2>
        <p>Choose a registered team, then edit any of its 15 existing player slots. A replacement updates that player record in place. It does not add a 16th player or remove the slot.</p>
        <label>Search team</label>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Team name or registration ID" />
        <label>Select registered team</label>
        <select value={teamId} onChange={event => { setTeamId(event.target.value); cancelEdit(); setNotice(''); }}>
          <option value="">Choose a team</option>
          {filteredTeams.map(item => <option key={item.id} value={item.id}>{item.name} · {item.reg_id}</option>)}
        </select>
      </div>
      {notice && <div className="good player-roster-notice" role="status">{notice}</div>}
      {team && (
        <>
          <div className="card player-roster-summary">
            <div><span className="admin-eyebrow">{team.reg_id || 'REGISTERED TEAM'}</span><h3>{team.name}</h3><p>{players.length} / 15 player records · {team.payment === 'verified' ? 'Payment verified' : 'Payment not verified'}</p></div>
            <strong className={players.length === 15 ? 'roster-count-ok' : 'roster-count-warning'}>{players.length}/15</strong>
          </div>
          {players.map((player, index) => (
            <article className="card player-roster-card" key={player.id}>
              <div className="player-roster-top">
                <img src={supabase.storage.from('player-photos').getPublicUrl(player.photo_path).data.publicUrl} alt="" />
                <div className="player-roster-info">
                  <span className="admin-eyebrow">SLOT {String(index + 1).padStart(2, '0')} · {index === 0 ? 'CAPTAIN 1' : index === 1 ? 'CAPTAIN 2' : 'PLAYER'}</span>
                  <b>{player.name}</b>
                  <small>Age {player.age} · {POSITIONS.find(([value]) => value === player.position)?.[1] || player.position}</small>
                  {index < 2 && <small dir="ltr">{player.mobile || 'No mobile number'}</small>}
                </div>
                <button type="button" className="btn alt" onClick={() => editing === player.id ? cancelEdit() : beginEdit(player)}>{editing === player.id ? 'Cancel' : 'Edit / Replace'}</button>
              </div>
              {editing === player.id && (
                <form className="player-roster-edit-form" onSubmit={event => savePlayer(event, player, index)}>
                  <label>New player name</label>
                  <input required maxLength={80} value={draft.name} onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} />
                  {index < 2 && <><label>Mobile number</label><input required inputMode="tel" dir="ltr" value={draft.mobile} onChange={event => setDraft(value => ({ ...value, mobile: event.target.value }))} placeholder="03XXXXXXXXX" /></>}
                  <label>Age</label>
                  <input required type="number" min="5" max="60" value={draft.age} onChange={event => setDraft(value => ({ ...value, age: event.target.value }))} />
                  <label>Playing role</label>
                  <select required value={draft.position} onChange={event => setDraft(value => ({ ...value, position: event.target.value }))}>
                    <option value="">Select role</option>
                    {POSITIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <label>New player photo (optional)</label>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setDraft(value => ({ ...value, file: event.target.files?.[0] || null }))} />
                  <small>Leave photo empty to keep the current image. Captain slots retain their captain position.</small>
                  <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Player Changes'}</button>
                </form>
              )}
            </article>
          ))}
          {players.length !== 15 && <div className="card player-roster-warning">This team currently has {players.length} player records, not 15. Review the roster before making changes. This editor will not add or delete player slots.</div>}
        </>
      )}
      {!team && <div className="card player-roster-empty">Select a registered team to view and edit its 15 player slots.</div>}
    </section>
  );
}
