'use client';
import {useEffect,useState} from 'react';
import {Brand,PublicFooter} from '@/components/product/nav';
import {apiJson} from '@/lib/auth-client';
type Metric={unique:number;total:number};
type Day={day:string;visit:Metric;dashboard:Metric;stock_search:Metric;watchlist_created:Metric;signup:Metric};
export default function Insights(){
  const [days,setDays]=useState<Day[]|null>(null),[error,setError]=useState('');
  useEffect(()=>{void apiJson<{days:Day[]}>('/api/analytics?days=14').then(data=>setDays(data.days||[])).catch(e=>setError((e as Error).message));},[]);
  const today=days?.[0];
  return <><header className="topbar"><Brand/><a className="quiet-link" href="/account">← Account</a></header>
    <main className="account-page insights-page">
      <p className="eyebrow">SITE OWNER</p>
      <h1>Product analytics</h1>
      <p className="intro">First-party counts stored in your database. Unique people use an anonymous browser id, not an IP address. Totals count every recorded action that day.</p>
      {error&&<p className="error-banner" role="alert">{error}</p>}
      {today&&<div className="insights-today">{([['Visited',today.visit],['Dashboard',today.dashboard],['Searched a stock',today.stock_search],['Created a watchlist',today.watchlist_created],['Signed up',today.signup]] as const).map(([label,metric])=><article key={label}><span>{label}</span><strong>{metric.unique}</strong><small>{metric.total} events today</small></article>)}</div>}
      {days?<table className="watchlist-index insights-table">
        <caption>Last 14 days (UTC)</caption>
        <thead><tr><th>Day</th><th>Visited</th><th>Dashboard</th><th>Searched</th><th>Watchlist</th><th>Signed up</th></tr></thead>
        <tbody>{days.map(row=><tr key={row.day}><th scope="row">{row.day}</th><td>{row.visit.unique} <small>/ {row.visit.total}</small></td><td>{row.dashboard.unique} <small>/ {row.dashboard.total}</small></td><td>{row.stock_search.unique} <small>/ {row.stock_search.total}</small></td><td>{row.watchlist_created.unique} <small>/ {row.watchlist_created.total}</small></td><td>{row.signup.unique} <small>/ {row.signup.total}</small></td></tr>)}</tbody>
      </table>:!error&&<p>Loading analytics…</p>}
    </main>
    <PublicFooter/>
  </>;
}
