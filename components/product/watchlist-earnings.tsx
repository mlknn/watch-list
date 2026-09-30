'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {CalendarDays,Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useLang,useT} from './language';
import type {Stock} from '@/lib/watchlist';
import {todayInMarket} from '@/lib/next-earnings.mjs';
import {earningsCalendarFile,earningsDay,upcomingEarnings} from '@/lib/watchlist-earnings.mjs';

type Result={symbol:string;date:string|null;failed:boolean};
const cache=new Map<string,{at:number;result:Result}>();

export function WatchlistEarnings({stocks}:{stocks:Stock[]}){
  const t=useT(),lang=useLang();
  const symbolKey=[...new Set(stocks.map(stock=>stock.symbol))].sort().join(',');
  const [state,setState]=useState<{key:string;rows:Result[];loading:boolean}>({key:'',rows:[],loading:true});
  const [attempt,setAttempt]=useState(0),[downloaded,setDownloaded]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    const symbols=symbolKey.split(',').filter(Boolean);
    const rows:Result[]=[];
    let cursor=0;
    async function worker(){
      while(cursor<symbols.length&&!controller.signal.aborted){
        const symbol=symbols[cursor++];
        const saved=cache.get(symbol);
        if(saved&&Date.now()-saved.at<300000){rows.push(saved.result);continue;}
        try{
          const response=await fetch('/api/stocks/'+encodeURIComponent(symbol)+'/fundamentals',{signal:controller.signal});
          if(!response.ok)throw new Error('Unavailable');
          const data=await response.json() as {available:boolean;earningsDate?:string};
          const result={symbol,date:earningsDay(data.earningsDate),failed:!data.available};
          rows.push(result);
          if(!result.failed){cache.set(symbol,{at:Date.now(),result});if(cache.size>100)cache.delete(cache.keys().next().value!);}
        }catch{if(!controller.signal.aborted)rows.push({symbol,date:null,failed:true});}
      }
    }
    void Promise.all(Array.from({length:Math.min(3,symbols.length)},()=>worker())).then(()=>{
      if(!controller.signal.aborted)setState({key:symbolKey,rows,loading:false});
    });
    return()=>controller.abort();
  },[symbolKey,attempt]);
  const loading=state.key!==symbolKey||state.loading;
  const rows=loading?[]:upcomingEarnings(state.rows,todayInMarket()) as Result[];
  const failures=loading?0:state.rows.filter(row=>row.failed).length;
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
    {loading?<output>{t('Loading earnings dates…')}</output>:<>
      {!!rows.length&&<ul>{rows.map(row=><li key={row.symbol}><Link href={'/stocks/'+encodeURIComponent(row.symbol)+'?from=%2Fwatchlists'}><strong>{row.symbol}</strong><span>{stocks.find(stock=>stock.symbol===row.symbol)?.companyName}</span></Link><time dateTime={row.date!}>{new Date(row.date+'T12:00:00Z').toLocaleDateString(locale,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}</time><Button variant="outline" onClick={()=>download(row)} aria-label={t('Add to calendar')+' · '+row.symbol}><Download size={15}/>{t('Add to calendar')}</Button></li>)}</ul>}
      {!rows.length&&!failures&&<p>{t('No upcoming earnings dates are available for this list yet.')}</p>}
      {unavailable>0&&rows.length>0&&<p>{unavailable} · {t('Stocks without a published upcoming date')}</p>}
      {failures>0&&<output className="earnings-retry"><span>{t('Some earnings dates could not be loaded.')}</span><Button variant="ghost" onClick={()=>{setState({key:symbolKey,rows:[],loading:true});setAttempt(n=>n+1);}}>{t('Retry')}</Button></output>}
    </>}
    <p className="field-note">{t('Dates may change. Calendar downloads include a one-day reminder and do not update automatically.')}</p>
    <output className="earnings-download-notice">{downloaded?t('Open the downloaded file in your calendar to add the event and reminder.'):''}</output>
  </section>;
}
