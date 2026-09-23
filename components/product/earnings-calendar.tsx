'use client';
import {useT} from '@/components/product/language';
import {T} from '@/components/product/language';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {ChevronLeft,ChevronRight,LoaderCircle} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {Button} from '@/components/ui/button';

type Company={symbol:string;name:string;when:string;reported:boolean;eps:string;epsForecast:string;marketCap?:number};
type Day={date:string;status:string;companies:Company[]};
type Board={weekStart:string;weekEnd:string;days:Day[];minWeek:string;maxWeek:string;todayMonday:string;source:string;timezone:string;fetchedAt:string};

function shiftWeek(monday:string,delta:number){
  const d=new Date(monday+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+delta*7);
  return d.toISOString().slice(0,10);
}
const dayFormat=(iso:string,options:Intl.DateTimeFormatOptions)=>new Date(iso+'T12:00:00Z').toLocaleDateString(undefined,{...options,timeZone:'UTC'});
const UNAVAILABLE='The earnings calendar is temporarily unavailable.';
const weekStore=new Map<string,Board>();

async function pullWeek(monday:string){
  const query=monday?'?week='+encodeURIComponent(monday):'';
  const r=await fetch('/api/earnings-calendar'+query);
  const result=await r.json() as Board&{error?:string};
  if(!r.ok)throw Error(result.error||UNAVAILABLE);
  weekStore.set(result.weekStart,result);
  if(!monday)weekStore.set('',result);
  return result;
}

function cachedWeek(monday:string){
  return weekStore.get(monday)||(!monday?weekStore.get(''):undefined);
}

export function EarningsCalendar(){
  const t=useT();
  const router=useRouter();
  const params=useSearchParams();
  const week=params.get('week')||'';
  const [data,setData]=useState<Board|null>(()=>cachedWeek(week)||null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(!cachedWeek(week));
  const [attempt,setAttempt]=useState(0);
  const today=useMemo(()=>new Date().toISOString().slice(0,10),[]);
  useEffect(()=>{
    let alive=true;
    const hit=cachedWeek(week);
    if(hit){setData(hit);setLoading(false);setError('');}
    else{setLoading(true);setError('');}
    void pullWeek(week).then(result=>{if(!alive)return;setData(result);setLoading(false);}).catch(e=>{if(alive&&!hit){setError(e.message||UNAVAILABLE);setLoading(false);}});
    return()=>{alive=false;};
  },[week,attempt]);
  /* After this week is on screen, walk 2–4 future weeks one by one so Next week is already local. */
  useEffect(()=>{
    if(!data)return;
    const ahead=data.weekStart===data.todayMonday?4:data.weekStart>data.todayMonday?3:2;
    let cancelled=false;
    const run=async()=>{
      for(let i=1;i<=ahead;i++){
        await new Promise(resolve=>window.setTimeout(resolve,280));
        if(cancelled)return;
        const monday=shiftWeek(data.weekStart,i);
        if(monday>data.maxWeek)return;
        if(weekStore.has(monday))continue;
        try{await pullWeek(monday);}catch{/* Keep the open week as-is if a later week misses. */}
      }
    };
    void run();
    return()=>{cancelled=true;};
  },[data?.weekStart,data?.todayMonday,data?.maxWeek]);
  const go=useCallback((next:string)=>{
    if(!data||next<data.minWeek||next>data.maxWeek)return;
    router.push(next===data.todayMonday?'/earnings':'/earnings?week='+next);
  },[data,router]);
  const timing=(row:Company)=>row.when==='bmo'?t('Before market open')
    :row.when==='amc'?t('After market close')
    :row.when==='during'?t('During market hours')
    :'';
  const byCap=(rows:Company[])=>[...rows].sort((a,b)=>(b.marketCap||0)-(a.marketCap||0));
  const days=data?.days||[];
  const prev=data?shiftWeek(data.weekStart,-1):'';
  const next=data?shiftWeek(data.weekStart,1):'';
  const canPrev=!!data&&prev>=data.minWeek;
  const canNext=!!data&&next<=data.maxWeek;
  const onThisWeek=!!data&&data.weekStart===data.todayMonday;
  const glowNext=onThisWeek&&canNext;
  const glowThis=!onThisWeek&&!!data;
  const range=data?`${dayFormat(data.weekStart,{month:'short',day:'numeric'})} – ${dayFormat(data.weekEnd,{month:'short',day:'numeric',year:'numeric'})}`:'';
  const relative=!data?'':data.weekStart===data.todayMonday?t('This week')
    :data.weekStart===shiftWeek(data.todayMonday,-1)?t('Last week')
    :data.weekStart===shiftWeek(data.todayMonday,1)?t('Next week')
    :data.weekStart<data.todayMonday?t('Past week'):t('Upcoming week');
  return <main className="earnings-cal-page">
    <div className="earnings-cal-head">
      <h1><T text="Earnings calendar"/></h1>
      <p className="intro"><T text="Upcoming and recent earnings for US-listed companies."/></p>
    </div>
    <div className="earnings-toolbar">
      <div className="earnings-range">
        <strong>{range||'—'}</strong>
        {relative&&<span className="earnings-range-tag">{relative}</span>}
      </div>
      <div className="earnings-cal-nav">
        <Button variant="outline" className="outline-button" disabled={!canPrev} onClick={()=>go(prev)}><ChevronLeft size={16}/><T text="Previous week"/></Button>
        <Button variant="outline" className={'outline-button'+(glowThis?' is-week-glow':'')} disabled={!data||onThisWeek} onClick={()=>go(data?.todayMonday||'')}><T text="This week"/></Button>
        <Button variant="outline" className={'outline-button'+(glowNext?' is-week-glow':'')} disabled={!canNext} onClick={()=>go(next)}><T text="Next week"/><ChevronRight size={16}/></Button>
      </div>
    </div>
    {error&&<div className="error-banner" role="alert">{error===UNAVAILABLE?t(UNAVAILABLE):error}<Button variant="ghost" onClick={()=>setAttempt(n=>n+1)}><T text="Retry"/></Button></div>}
    {loading?<div className="earnings-week is-loading" role="status">
      {[0,1,2,3,4].map(i=><section key={i} className="earnings-day"><header><strong>&nbsp;</strong></header><p className="earnings-day-note"><LoaderCircle size={14} className="spin"/>{i===0?t('Loading earnings…'):''}</p></section>)}
    </div>:!data?null:
      <div className="earnings-week" aria-live="polite">
        {days.map(day=>{
          const isToday=day.date===today;
          return <section key={day.date} className={'earnings-day'+(isToday?' is-today':'')+(day.date<today?' is-past':'')}>
            <header>
              <strong>{dayFormat(day.date,{weekday:'short'})}</strong>
              <span>{dayFormat(day.date,{month:'short',day:'numeric'})}</span>
              {isToday&&<em className="earnings-today-tag">{t('Today')}</em>}
              {day.companies.length>0&&<small>{day.companies.length}</small>}
            </header>
            {day.status!=='ok'?<p className="earnings-day-note is-error">{t('Could not load this day.')}</p>
              :day.companies.length?<ul className="earnings-day-list">
                {byCap(day.companies).map(row=>{
                  const slot=row.reported&&row.eps?`${t('EPS')} ${row.eps}${row.epsForecast?` · ${t('est.')} ${row.epsForecast}`:''}`:timing(row);
                  return <li key={row.symbol}>
                    <a href={'/stocks/'+encodeURIComponent(row.symbol)} className="earnings-chip">
                      <CompanyIcon symbol={row.symbol}/>
                      <span className="earnings-chip-text">
                        <strong>{row.symbol}{row.reported&&<i className="earnings-reported">{t('Reported')}</i>}</strong>
                        <small title={row.name}>{row.name}</small>
                        {slot?<em>{slot}</em>:null}
                      </span>
                    </a>
                  </li>;
                })}
              </ul>:<p className="earnings-day-note">{t('No earnings scheduled')}</p>}
          </section>;
        })}
      </div>
    }
    <p className="market-footnote">
      <T text="Source: Nasdaq earnings calendar · Report times are New York time · US-listed companies above $1B."/>
      {data?` ${t('Updated')} ${new Date(data.fetchedAt).toLocaleString()}.`:''} <T text="Past weeks go back two quarters."/>
    </p>
  </main>;
}
