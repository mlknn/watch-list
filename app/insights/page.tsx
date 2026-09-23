'use client';
import {useEffect,useState} from 'react';
import {Brand,PublicFooter} from '@/components/product/nav';
import {ThemeToggle} from '@/components/product/theme';
import {Button} from '@/components/ui/button';
import {apiJson} from '@/lib/auth-client';
import {T,useT} from '@/components/product/language';
type Metric={unique:number;total:number};
type Day={day:string;visit:Metric;dashboard:Metric;stock_search:Metric;watchlist_created:Metric;signup:Metric};
export default function Insights(){
  const t=useT();
  const [days,setDays]=useState<Day[]|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{void apiJson<{days:Day[]}>('/api/analytics?days=14').then(data=>setDays(data.days||[])).catch(e=>{const message=(e as Error).message;if(/sign in|owner/i.test(message)){window.location.replace('/account');return;}setError(message);});},[attempt]);
  const today=days?.[0];
  return <><header className="topbar"><Brand/><div className="account-nav"><ThemeToggle/><a className="quiet-link" href="/account">← {t('Account')}</a></div></header>
    <main className="account-page insights-page">
      <p className="eyebrow">{t('ANALYTICS')}</p>
      <h1>{t('Product analytics')}</h1>
      <p className="intro">{t('First-party counts stored in your database. Unique browsers use an anonymous browser id, not a person. Totals count every recorded action that day. Days are reported in UTC.')}</p>
      {!days&&!error&&<p role="status">{t('Loading analytics…')}</p>}
      {error&&<p className="error-banner" role="alert">{error}<Button variant="ghost" onClick={()=>{setError('');setDays(null);setAttempt(n=>n+1);}}>{t('Retry')}</Button></p>}
      {days&&!days.length&&<p className="earnings-empty">{t('No analytics events in this period yet.')}</p>}
      {today&&<div className="insights-today">{([[t('Visited'),today.visit],[t('Dashboard'),today.dashboard],[t('Searched a stock'),today.stock_search],[t('Created a watchlist'),today.watchlist_created],[t('Signed up'),today.signup]] as const).map(([label,metric])=><article key={label}><span>{label}</span><strong>{metric.unique}</strong><small>{metric.unique} {t('unique browsers')} · {metric.total} {t('events today')}</small></article>)}</div>}
      {!!days?.length&&<table className="watchlist-index insights-table">
        <caption>{t('Last 14 days (UTC)')}. {t('Unique browsers / event totals.')}</caption>
        <thead><tr><th>{t('Day')}</th><th>{t('Visited')}</th><th>{t('Dashboard')}</th><th>{t('Searched')}</th><th>{t('Watchlist')}</th><th>{t('Signed up')}</th></tr></thead>
        <tbody>{days.map(row=><tr key={row.day}><th scope="row">{row.day}</th><td>{row.visit.unique} <small>/ {row.visit.total}</small></td><td>{row.dashboard.unique} <small>/ {row.dashboard.total}</small></td><td>{row.stock_search.unique} <small>/ {row.stock_search.total}</small></td><td>{row.watchlist_created.unique} <small>/ {row.watchlist_created.total}</small></td><td>{row.signup.unique} <small>/ {row.signup.total}</small></td></tr>)}</tbody>
      </table>}
    </main>
    <PublicFooter/>
  </>;
}
