'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const DAY = 24 * 60 * 60 * 1000;
const fmt = value => new Intl.NumberFormat().format(value);
const dateKey = value => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function AdminAnalytics({ supabase }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState(7);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    const since = new Date(Date.now() - range * DAY).toISOString();
    const { data, error: queryError } = await supabase
      .from('page_visits')
      .select('anonymous_id,page_path,device_type,visitor_email,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (queryError) setError(queryError.message);
    else setRows(data || []);
    setLoading(false);
  }, [supabase, range]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const unique = new Set(rows.map(x => x.anonymous_id).filter(Boolean)).size;
    const devices = rows.reduce((a,x) => { const k=x.device_type || 'unknown'; a[k]=(a[k]||0)+1; return a; }, {});
    const pages = rows.reduce((a,x) => { const k=x.page_path || '/'; a[k]=(a[k]||0)+1; return a; }, {});
    const daily = {};
    for (let i=range-1;i>=0;i--) {
      const d=new Date(Date.now()-i*DAY); daily[dateKey(d)]=0;
    }
    rows.forEach(x => { const k=dateKey(x.created_at); if (k in daily) daily[k]++; });
    return { unique, devices, pages, daily };
  }, [rows, range]);
  const maxDay = Math.max(1,...Object.values(stats.daily));
  const topPages = Object.entries(stats.pages).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return (
    <div className="admin-analytics">
      <div className="card">
        <div className="admin-analytics-head">
          <div><h3>Website Traffic</h3><p>Recorded page visits from the BJL website</p></div>
          <div className="admin-analytics-controls">
            <select value={range} onChange={e=>setRange(Number(e.target.value))}>
              <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
            </select>
            <button type="button" className="btn alt" onClick={load}>Refresh</button>
          </div>
        </div>
        {error && <div className="err">{error}</div>}
        {loading ? <p>Loading traffic data…</p> : <>
          <div className="admin-analytics-stats">
            <article><small>Total visits</small><strong>{fmt(rows.length)}</strong></article>
            <article><small>Unique browsers</small><strong>{fmt(stats.unique)}</strong></article>
            <article><small>Pages tracked</small><strong>{fmt(Object.keys(stats.pages).length)}</strong></article>
          </div>
          {rows.length===0 ? <p>No visits were recorded in this period.</p> : <>
            <h4>Visits by day</h4>
            <div className="admin-analytics-chart">
              {Object.entries(stats.daily).map(([day,count])=><div className="admin-analytics-bar" key={day} title={day+': '+count+' visits'}>
                <span style={{height:Math.max(3,(count/maxDay)*100)+'%'}} />
                <small>{day.slice(5)}</small>
              </div>)}
            </div>
            <div className="admin-analytics-grid">
              <section><h4>Top pages</h4>{topPages.map(([path,count])=><div className="admin-analytics-line" key={path}><span dir="ltr">{path}</span><b>{fmt(count)}</b></div>)}</section>
              <section><h4>Devices</h4>{Object.entries(stats.devices).sort((a,b)=>b[1]-a[1]).map(([device,count])=><div className="admin-analytics-line" key={device}><span>{device}</span><b>{fmt(count)}</b></div>)}</section>
            </div>
          </>}
          <p className="admin-analytics-note">Privacy note: this tracker records anonymous browser IDs and page paths. Visitor emails and time-on-page are not currently collected, so they cannot be reported here.</p>
        </>}
      </div>
    </div>
  );
}
