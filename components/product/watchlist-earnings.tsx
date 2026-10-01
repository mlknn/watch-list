'use client';
import {publicDataJson} from '@/lib/request-timeout.mjs';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {CalendarDays,Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useLang,useT} from './language';
import type {Stock} from '@/lib/watchlist';
import {todayInMarket} from '@/lib/next-earnings.mjs';
import {earningsCalendarFile,upcomingEarnings} from '@/lib/watchlist-earnings.mjs';

type Result={symbol:string;date:string|null;status:'available'|'unknown'|'unavailable'|'stale'};


export function WatchlistEarnings({stocks}:{stocks:Stock[]}){
  const t=useT(),lang=useLang();
  const symbolKey=[...new Set(stocks.map(stock=>stock.symbol))].sort().join(',');
  const [state,setState]=useState<{key:string;rows:Result[];loading:boolean}>({key:'',rows:[],loading:true});
  const [attempt,setAttempt]=useState(0),[downloaded,setDownloaded]=useState(false);
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
  function download(row:Result){
    const contents=earningsCalendarFile({...row,companyName:stocks.find(stock=>stock.symbol===row.symbol)?.companyName});
    const url=URL.createObjectURL(new Blob([contents],{type:'text/calendar;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`${row.symbol}-earnings.ics`;anchor.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),10000);
    setDownloaded(true);
  }
  return <section className="watchlist-earnings" aria-label={t('Your upcoming earnings')}>
    <header><div><h3><CalendarDays size={18} aria-hidden="true"/>{t('Your upcoming earnings')}</h3><p>{t('Estimated report dates for stocks in this watchlist.')}</p></div><Link href="/earnings?watch=1">{t('View earnings calendar')}</Link></header>
    {loading&&<output>{t('Loading earnings dates…')}</output>}<>
      {!!rows.length&&<ul>{rows.map(row=><li key={row.symbol}><Link href={'/stocks/'+encodeURIComponent(row.symbol)+'?from=%2Fwatchlists'}><strong>{row.symbol}</strong><span>{stocks.find(stock=>stock.symbol===row.symbol)?.companyName}</span></Link><time dateTime={row.date!}>{new Date(row.date+'T12:00:00Z').toLocaleDateString(locale,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}</time><Button variant="outline" onClick={()=>download(row)} aria-label={t('Add to calendar')+' · '+row.symbol}><Download size={15}/>{t('Add to calendar')}</Button></li>)}</ul>}
      {!loading&&!rows.length&&!failures&&<p>{t('No upcoming earnings dates are available for this list yet.')}</p>}
      {unavailable>0&&rows.length>0&&<p>{unavailable} · {t('Stocks without a published upcoming date')}</p>}
      {failures>0&&<output className="earnings-retry"><span>{t('Dates temporarily unavailable for')}: {state.rows.filter(row=>row.status==='unavailable').map(row=>row.symbol).join(', ')}</span><Button variant="ghost" onClick={()=>{setState(current=>({...current,loading:true}));setAttempt(n=>n+1);}}>{t('Retry')}</Button></output>}
    </>
    {state.rows.some(row=>row.status==='stale')&&<p>{t('Showing the last available dates. Please verify before the event.')}</p>}
    <p className="field-note">{t('Dates may change. Calendar downloads include a one-day reminder and do not update automatically.')}</p>
    <output className="earnings-download-notice">{downloaded?t('Open the downloaded file in your calendar to add the event and reminder.'):''}</output>
  </section>;
}
