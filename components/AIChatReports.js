'use client';

import { useCallback, useEffect, useState } from 'react';

const fmt = value => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function AIChatReports({ supabase }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase.from('ai_chat_reports')
      .select('id,visitor_key,messages,created_at').order('created_at', { ascending: false }).limit(100);
    if (queryError) setError(queryError.message);
    else setRows(data || []);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);
  return <section className="card bjl-chat-reports">
    <div className="admin-analytics-head">
      <div><h3>🤖 AI Help Center Reports</h3><p>Recent BJL support conversations, latest 100</p></div>
      <button type="button" className="btn alt" onClick={load}>↻ Refresh</button>
    </div>
    <p className="admin-analytics-note">Visitor emails and phone numbers are masked before saving. Visitor IDs are hashed. Reports are retained for up to 90 days.</p>
    {error && <div className="err">{error}</div>}
    {loading ? <p>Loading AI reports…</p> : rows.length === 0 ? <p>No AI conversations have been recorded yet.</p> :
      <div className="bjl-chat-report-list">{rows.map(row => <article className="bjl-chat-report" key={row.id}>
        <button type="button" className="bjl-chat-report-head" onClick={() => setSelected(selected === row.id ? null : row.id)}>
          <span><b>Report #{row.id}</b><small>{fmt(row.created_at)}</small></span>
          <span>{(row.messages || []).filter(x => x.role === 'user').length} visitor messages　{selected === row.id ? '−' : '+'}</span>
        </button>
        {selected === row.id && <div className="bjl-chat-transcript">{(row.messages || []).map((m, i) =>
          <div className={'bjl-chat-line ' + m.role} key={i}><b>{m.role === 'user' ? 'Visitor' : 'BJL Assistant'}</b><p>{m.content}</p></div>)}</div>}
      </article>)}</div>}
  </section>;
}
