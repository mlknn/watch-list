'use client';
import {T,useT} from '@/components/product/language';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {price} from '@/lib/watchlist';
import type {ShowcaseData} from './showcase';

type EtfRow={symbol:string;chart:{companyName:string;currency:string;quote:{price:number;changePercent:number|null}}|null};
type EarningsCompany={symbol:string;name:string;reported:boolean;when?:string};
type EarningsDay={date:string;status:string;companies:EarningsCompany[]};
type EarningsWeek={weekStart?:string;days?:EarningsDay[]};

function addDays(iso:string,days:number){
  const next=new Date(iso+'T12:00:00Z');
  next.setUTCDate(next.getUTCDate()+days);
  return next.toISOString().slice(0,10);
}

const pct=(value:number|null|undefined)=>value===null||value===undefined?'—':`${value>=0?'+':''}${value.toFixed(2)}%`;
const tone=(value:number|null|undefined)=>value===null||value===undefined?'':value>=0?'up':'down';

function useEtfs(){
  const [rows,setRows]=useState<EtfRow[]|null>(null);
  useEffect(()=>{
    let alive=true;
    void fetch('/api/market?group=us-etfs').then(async r=>{
      const result=await r.json() as {group?:{stocks:EtfRow[]}};
      if(alive)setRows(result.group?.stocks||[]);
    }).catch(()=>{if(alive)setRows([]);});
    return()=>{alive=false;};
  },[]);
  return rows;
}

function useEarnings(){
  const [days,setDays]=useState<EarningsDay[]|null>(null);
  const [weekStart,setWeekStart]=useState('');
  useEffect(()=>{
    let alive=true;
    void fetch('/api/earnings-calendar').then(async r=>{
      const current=await r.json() as EarningsWeek;
      const nextMonday=current.weekStart?addDays(current.weekStart,7):'';
      const upcoming=nextMonday?await fetch('/api/earnings-calendar?week='+encodeURIComponent(nextMonday)).then(res=>res.json() as Promise<EarningsWeek>).catch(()=>({days:[]})):{days:[]};
      if(!alive)return;
      setWeekStart(current.weekStart||'');
      setDays([...(current.days||[]),...(upcoming.days||[])]);
    }).catch(()=>{if(alive){setDays([]);setWeekStart('');}});
    return()=>{alive=false;};
  },[]);
  return {days,weekStart};
}

function PreviewFrame({label,ready,empty,children}:{label:string;ready:boolean;empty:string;children:React.ReactNode}){
  return <div className="tool-preview">
    <span className="tool-preview-label">{label}</span>
    {ready?<ul className="tool-preview-list">{children}</ul>:<p className="tool-preview-note" role="status">{empty}</p>}
  </div>;
}

export function HomeTools({showcase}:{showcase:ShowcaseData|null}){
  const t=useT();
  const etfs=useEtfs();
  const {days,weekStart}=useEarnings();
  const picks=showcase?.stocks.slice(0,3)||[];
  const funds=(etfs||[]).filter(row=>row.chart).slice(0,3);
  const today=useMemo(()=>new Date().toISOString().slice(0,10),[]);
  /* Always show the next unreported dates — today, later this week, or next week — never already-published results. */
  const earnings=useMemo(()=>{
    const rows=(days||[]).filter(day=>day.status==='ok').flatMap(day=>day.companies.map(row=>({...row,date:day.date}))).filter(row=>!row.reported&&row.date>=today);
    const first=rows[0]?.date||'';
    const nextMonday=weekStart?addDays(weekStart,7):'';
    const label=first===today?'Reporting today':first&&weekStart&&first<nextMonday?'Reporting this week':'Reporting next week';
    return {label,rows:rows.slice(0,3)};
  },[days,today,weekStart]);
  const dayLabel=(iso:string)=>new Date(iso+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
  const timing=(when?:string)=>when==='bmo'?t('Before market open'):when==='amc'?t('After market close'):when==='during'?t('During market hours'):t('Time not provided');
  return <section className="home-tools" aria-label={t('What you can do here')}>
    <article className="tool-card">
      <h2><T text="Watchlists"/></h2>
      <p><T text="Follow your stock ideas from the day you add them, with optional share counts and costs."/></p>
      <PreviewFrame label={t('Example watchlist · since 2021')} ready={picks.length>0} empty={t('Loading prices…')}>
        {picks.map(stock=><li key={stock.symbol}>
          <CompanyIcon symbol={stock.symbol}/>
          <span className="tool-preview-name">{stock.symbol}</span>
          <span className={'tool-preview-value '+tone(stock.changePercent)}>{pct(stock.changePercent)}</span>
        </li>)}
      </PreviewFrame>
      <a className="tool-link" href="/watchlists"><T text="Build a watchlist"/><ArrowUpRight size={16}/></a>
    </article>
    <article className="tool-card">
      <h2><T text="Markets"/></h2>
      <p><T text="Indexes, sectors, crypto and ETFs across the US, Europe, Canada and Turkey."/></p>
      <PreviewFrame label={t('US ETFs today')} ready={funds.length>0} empty={t('Loading quotes…')}>
        {funds.map(row=><li key={row.symbol}>
          <CompanyIcon symbol={row.symbol}/>
          <span className="tool-preview-name">{row.symbol}</span>
          <span className="tool-preview-sub">{price(row.chart!.quote.price,row.chart!.currency)}</span>
          <span className={'tool-preview-value '+tone(row.chart!.quote.changePercent)}>{pct(row.chart!.quote.changePercent)}</span>
        </li>)}
      </PreviewFrame>
      <a className="tool-link" href="/dashboard"><T text="Explore markets"/><ArrowUpRight size={16}/></a>
    </article>
    <article className="tool-card">
      <h2><T text="Earnings"/></h2>
      <p><T text="See which US-listed companies report next, day by day."/></p>
      <PreviewFrame label={t(earnings.label)} ready={earnings.rows.length>0} empty={days?t('No upcoming reports this week or next.'):t('Loading the calendar…')}>
        {earnings.rows.map(row=><li key={row.symbol+row.date}>
          <CompanyIcon symbol={row.symbol}/>
          <span className="tool-preview-copy"><span className="tool-preview-name">{row.symbol}</span><span className="tool-preview-sub">{row.name}</span></span>
          <span className="tool-preview-value">{dayLabel(row.date)}<small>{timing(row.when)}</small></span>
        </li>)}
      </PreviewFrame>
      <a className="tool-link" href="/earnings"><T text="View earnings"/><ArrowUpRight size={16}/></a>
    </article>
  </section>;
}
