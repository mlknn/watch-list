'use client';
import {publicDataJson} from '@/lib/request-timeout.mjs';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {CalendarDays} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useLang,useT} from './language';
import type {Stock} from '@/lib/watchlist';
import {todayInMarket} from '@/lib/next-earnings.mjs';
import {upcomingEarnings} from '@/lib/watchlist-earnings.mjs';

import {CompanyIcon} from './company-icon';

type Result={symbol:string;date:string|null;status:'available'|'unknown'|'unavailable'|'stale'};


export function WatchlistEarnings({stocks}:{stocks:Stock[]}){
  const t=useT(),lang=useLang();
  const symbolKey=[...new Set(stocks.map(stock=>stock.symbol))].sort().join(',');
  const [state,setState]=useState<{key:string;rows:Result[];loading:boolean}>({key:'',rows:[],loading:true});
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    // Wait for the usable watchlist to paint before starting optional calendar work.
    let nextFrame=0;
    const frame=requestAnimationFrame(()=>{nextFrame=requestAnimationFrame(()=>{
    if(!symbolKey)return;
    void publicDataJson('/api/watchlist-earnings?symbols='+encodeURIComponent(symbolKey),{signal:controller.signal}).then((data:{rows:Result[]})=>{
      if(!controller.signal.aborted)setState({key:symbolKey,rows:data.rows,loading:false});
    }).catch(()=>{
      if(!controller.signal.aborted)setState(current=>({key:symbolKey,rows:symbolKey.split(',').map(symbol=>current.rows.find(row=>row.symbol===symbol&&row.date)?{...current.rows.find(row=>row.symbol===symbol&&row.date)!,status:'stale'}:{symbol,date:null,status:'unavailable'}),loading:false}));
    });
    });});
    return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(nextFrame);controller.abort();};
  },[symbolKey,attempt]);
  const loading=state.key!==symbolKey||state.loading;
  const rows=state.key===symbolKey?upcomingEarnings(state.rows,todayInMarket()) as Result[]:[];
  const failures=loading?0:state.rows.filter(row=>row.status==='unavailable').length;
  const unavailable=loading?0:state.rows.length-rows.length-failures;
  const locale=lang==='tr'?'tr-TR':lang==='es'?'es-ES':'en-US';

  const today=todayInMarket();
  const base=new Date(today+'T12:00:00Z');
  const monthLabel=(date:Date)=>date.toLocaleDateString(locale,{month:'long',year:'numeric',timeZone:'UTC'});
  const months=Array.from({length:3},(_,offset)=>{
    const month=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+offset,1,12));
    const key=month.toISOString().slice(0,7),firstDay=(month.getUTCDay()+6)%7;
    const days=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
    const cells=Array.from({length:42},(_,index)=>{
      const day=index-firstDay+1;
      return day<1||day>days?null:key+'-'+String(day).padStart(2,'0');
    });
    return {key,label:monthLabel(month),cells};
  });
  return <section className="watchlist-earnings earnings-month-calendar" aria-label={t('Your upcoming earnings')}>
    <header><div><h3><CalendarDays size={18} aria-hidden="true"/>{t('Your upcoming earnings')}</h3><p>{t('Estimated report dates for stocks in this watchlist.')}</p></div><Link href="/earnings?watch=1">{t('View earnings calendar')}</Link></header>
    <div className="earnings-months-overview">{months.map(month=><section className="earnings-mini-month" key={month.key} aria-label={month.label}>
    <h4>{month.label}</h4>
    <div className="earnings-calendar-grid" aria-busy={loading}>
      {Array.from({length:7},(_,i)=><div className="earnings-weekday" key={'weekday'+i}>{new Date(Date.UTC(2026,0,5+i)).toLocaleDateString(locale,{weekday:'short',timeZone:'UTC'})}</div>)}
      {month.cells.map((date,index)=><div key={date||'blank'+index} className={'earnings-day'+(!date?' is-empty':'')+(date===today?' is-today':'')}>
        {date&&<><time dateTime={date} aria-current={date===today?'date':undefined}>{Number(date.slice(-2))}</time>
        <div className="earnings-day-events">{rows.filter(row=>row.date===date).map(row=>{
          const company=stocks.find(stock=>stock.symbol===row.symbol)?.companyName||row.symbol;
          return <Link key={row.symbol} className="earnings-company-event" href={'/stocks/'+encodeURIComponent(row.symbol)+'?from=%2Fwatchlists'} title={company+' · '+date} aria-label={company+' · '+date}><CompanyIcon symbol={row.symbol}/><strong>{row.symbol}</strong></Link>;
        })}</div></>}
      </div>)}
    </div>
    </section>)}</div>
    <div className="earnings-calendar-status" aria-live="polite">
      {loading?<output>{t('Loading earnings dates…')}</output>:!rows.length&&!failures&&<p>{t('No upcoming earnings dates are available for this list yet.')}</p>}
      {unavailable>0&&<p>{unavailable} · {t('Stocks without a published upcoming date')}</p>}
      {failures>0&&<output className="earnings-retry"><span>{t('Dates temporarily unavailable for')}: {state.rows.filter(row=>row.status==='unavailable').map(row=>row.symbol).join(', ')}</span><Button variant="ghost" onClick={()=>{setState(current=>({...current,loading:true}));setAttempt(n=>n+1);}}>{t('Retry')}</Button></output>}
      {state.rows.some(row=>row.status==='stale')&&<p>{t('Showing the last available dates. Please verify before the event.')}</p>}
      <p className="field-note">{t('Estimated dates may change.')}</p>
    </div>
  </section>;
}
