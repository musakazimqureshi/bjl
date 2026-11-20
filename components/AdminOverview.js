'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const dateDMY = value => { if (!value) return ''; const [y,m,d] = String(value).slice(0,10).split('-'); return y && m && d ? `${d.padStart(2,'0')} ${m.padStart(2,'0')} ${y}` : value; };
const number = n => new Intl.NumberFormat().format(n || 0);
const dayKey = value => {
  const d = new Date(value);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

function Ring({ value, total, color, label }) {
  const pct = total ? Math.min(100, Math.round(value / total * 100)) : 0;
  return <div className="bjl-ring-wrap"><div className="bjl-ring" style={{ '--ring-value': pct + '%', '--ring-color': color }}><div><strong>{pct}%</strong><small>{label}</small></div></div><span>{number(value)} <i>/ {number(total)}</i></span></div>;
}

export default function AdminOverview({ supabase, teams = [], objections = [] }) {
  const [visits, setVisits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    const since = new Date(Date.now() - 29 * 86400000).toISOString();
    const [v, p, m] = await Promise.all([
      supabase.from('page_visits').select('created_at,page_path,device_type').gte('created_at', since).order('created_at', { ascending: true }).limit(5000),
      supabase.from('payments').select('id,status,amount,created_at').order('created_at', { ascending: false }).limit(1000),
      supabase.from('matches').select('id,match_date,published,winner_team').order('match_date', { ascending: true }).limit(200)
    ]);
    if (v.error) setError(v.error.message);
    setVisits(v.data || []); setPayments(p.data || []); setMatches(m.data || []);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const days = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
      days[dayKey(d)] = 0;
    }
    visits.forEach(v => { const k = dayKey(v.created_at); if (k in days) days[k]++; });
    const verified = teams.filter(t => t.payment === 'verified').length;
    const pending = teams.filter(t => !['verified', 'rejected'].includes(t.payment)).length;
    const open = objections.filter(o => o.status === 'open').length;
    const totalPlayers = teams.reduce((n, t) => n + (t.players?.length || 0), 0);
    const paid = payments.filter(p => p.status === 'verified').reduce((n, p) => n + Number(p.amount || 0), 0);
    const devices = visits.reduce((a, v) => { const k = v.device_type || 'unknown'; a[k] = (a[k] || 0) + 1; return a; }, {});
    const pages = visits.reduce((a, v) => { const k = v.page_path || '/'; a[k] = (a[k] || 0) + 1; return a; }, {});
    return { days: Object.entries(days), verified, pending, open, totalPlayers, paid, devices, pages };
  }, [teams, objections, payments, visits]);
  const maxVisit = Math.max(1, ...stats.days.map(x => x[1]));
  const topPages = Object.entries(stats.pages).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const upcoming = matches.filter(m => m.published && m.match_date && new Date(m.match_date + 'T23:59:59') >= new Date()).slice(0, 4);
  return <div className="bjl-overview">
    <div className="bjl-overview-heading"><div><span className="admin-eyebrow">TOURNAMENT AT A GLANCE</span><h2>Dashboard Overview</h2><p>Live figures from your BJL records. Refresh to sync the latest activity.</p></div><button className="btn alt" onClick={load} disabled={loading}>{loading ? 'Updating…' : '↻ Refresh data'}</button></div>
    {error && <div className="err">{error}</div>}
    <div className="bjl-overview-kpis">
      <article><span className="bjl-kpi-icon red">♟</span><div><small>Registered Teams</small><strong>{number(teams.length)}</strong><em>All registrations</em></div><span className="bjl-kpi-arrow">↗</span></article>
      <article><span className="bjl-kpi-icon blue">♙</span><div><small>Registered Players</small><strong>{number(stats.totalPlayers)}</strong><em>Across all teams</em><span className="bjl-kpi-arrow">↗</span></div></article>
      <article><span className="bjl-kpi-icon green">✓</span><div><small>Verified Payments</small><strong>{number(stats.verified)}</strong><em>{number(stats.pending)} awaiting review</em></div><span className="bjl-kpi-arrow">↗</span></article>
      <article><span className="bjl-kpi-icon amber">⚑</span><div><small>Open Appeals</small><strong>{number(stats.open)}</strong><em>Need admin attention</em></div><span className="bjl-kpi-arrow">↗</span></article>
    </div>
    <div className="bjl-overview-grid">
      <section className="bjl-panel bjl-traffic-panel"><div className="bjl-panel-head"><div><small>LAST 30 DAYS</small><h3>Website Activity</h3></div><span className="bjl-panel-pill">◉ {number(visits.length)} visits</span></div>
        {loading ? <p>Loading activity…</p> : visits.length ? <><div className="bjl-visit-bars">{stats.days.map(([day, count]) => <div key={day} title={day + ': ' + count + ' visits'}><span style={{ height: Math.max(count ? 5 : 2, count / maxVisit * 100) + '%' }} /><small>{day.slice(8)}</small></div>)}</div><div className="bjl-chart-foot"><span>30 days ago</span><b>Daily page visits</b><span>Today</span></div></> : <div className="bjl-empty">No traffic visits recorded in this period yet.</div>}
      </section>
      <section className="bjl-panel"><div className="bjl-panel-head"><div><small>REGISTRATION HEALTH</small><h3>Payment Progress</h3></div><span>◎</span></div>
        <div className="bjl-rings"><Ring value={stats.verified} total={teams.length} color="#32c58b" label="Paid" /><Ring value={stats.pending} total={teams.length} color="#e9ad4c" label="Pending" /></div>
        <div className="bjl-panel-note"><span><i className="dot green" /> Verified</span><span><i className="dot amber" /> Pending / review</span></div>
      </section>
      <section className="bjl-panel"><div className="bjl-panel-head"><div><small>CONTENT DISCOVERY</small><h3>Top Pages</h3></div><span>⌕</span></div>
        {topPages.length ? topPages.map(([path, count]) => <div className="bjl-rank-row" key={path}><span dir="ltr">{path}</span><b>{number(count)}</b></div>) : <div className="bjl-empty">Page analytics will appear when visits are recorded.</div>}
      </section>
      <section className="bjl-panel"><div className="bjl-panel-head"><div><small>TOURNAMENT SCHEDULE</small><h3>Upcoming Matches</h3></div><span>🏏</span></div>
        {upcoming.length ? upcoming.map(m => <div className="bjl-match-row" key={m.id}><span className="bjl-match-date">{dateDMY(m.match_date)}</span><span>{m.kind === 'final' ? 'Final' : 'Match'} · {m.winner_team ? 'Result recorded' : 'Scheduled'}</span><b>{m.published ? 'LIVE' : 'DRAFT'}</b></div>) : <div className="bjl-empty">No published upcoming matches found.</div>}
      </section>
    </div>
    <div className="bjl-overview-footer"><span><i className="bjl-status-dot" /> Database connected</span><span>Last 30 days · Refresh for latest records</span></div>
  </div>;
}
