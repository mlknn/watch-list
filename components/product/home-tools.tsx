'use client';
import {T,useT} from '@/components/product/language';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {price} from '@/lib/watchlist';
import type {ShowcaseData} from './showcase';

type EtfRow={symbol:string;chart:{companyName:string;currency:string;quote:{price:number;changePercent:number|null}}|null};
type EarningsCompany={symbol:string;name:string;reported:boolean};
type EarningsDay={date:string;status:string;companies:EarningsCompany[]};

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
  useEffect(()=>{
    let alive=true;
    void fetch('/api/earnings-calendar').then(async r=>{
      const result=await r.json() as {days?:EarningsDay[]};
      if(alive)setDays(result.days||[]);
    }).catch(()=>{if(alive)setDays([]);});
    return()=>{alive=false;};
  },[]);
  return days;
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
  const days=useEarnings();
  const picks=showcase?.stocks.slice(0,3)||[];
  const funds=(etfs||[]).filter(row=>row.chart).slice(0,3);
  const today=useMemo(()=>new Date().toISOString().slice(0,10),[]);
  const upcoming=useMemo(()=>{
    const all=(days||[]).filter(day=>day.status==='ok');
    const ahead=all.filter(day=>day.date>=today).flatMap(day=>day.companies.map(row=>({...row,date:day.date})));
    const behind=all.filter(day=>day.date<today).flatMap(day=>day.companies.map(row=>({...row,date:day.date})));
    return (ahead.length?ahead:behind.reverse()).slice(0,3);
  },[days,today]);
  const weekday=(iso:string)=>new Date(iso+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'short',timeZone:'UTC'});
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
      <p><T text="Indexes, sectors and ETFs across the US, Europe, Canada and Turkey."/></p>
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
      <PreviewFrame label={t('This week')} ready={upcoming.length>0} empty={days?t('No earnings scheduled this week.'):t('Loading the calendar…')}>
        {upcoming.map(row=><li key={row.symbol}>
          <CompanyIcon symbol={row.symbol}/>
          <span className="tool-preview-name">{row.symbol}</span>
          <span className="tool-preview-sub">{weekday(row.date)}</span>
          {row.reported&&<span className="tool-preview-value">{t('Reported')}</span>}
        </li>)}
      </PreviewFrame>
      <a className="tool-link" href="/earnings"><T text="View earnings"/><ArrowUpRight size={16}/></a>
    </article>
  </section>;
}
