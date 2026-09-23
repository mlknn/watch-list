'use client';
import {T,useT} from '@/components/product/language';
import {useEffect,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {price} from '@/lib/watchlist';
import type {ShowcaseData} from './showcase';

type EtfRow={symbol:string;chart:{companyName:string;currency:string;quote:{price:number;changePercent:number|null}}|null};
type EarningsPreview={label:string;rows:{symbol:string;date:string}[]};

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
  const [preview,setPreview]=useState<EarningsPreview|null>(null);
  useEffect(()=>{
    let alive=true;
    void fetch('/api/earnings-preview').then(async r=>{
      const data=await r.json() as EarningsPreview;
      if(alive)setPreview({label:data.label||'Reporting this week',rows:data.rows||[]});
    }).catch(()=>{if(alive)setPreview({label:'Reporting this week',rows:[]});});
    return()=>{alive=false;};
  },[]);
  return preview;
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
  const earnings=useEarnings();
  const picks=showcase?.stocks.slice(0,5)||[];
  const funds=(etfs||[]).filter(row=>row.chart).slice(0,5);
  const dayLabel=(iso:string)=>new Date(iso+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'short',day:'numeric',timeZone:'UTC'});
  return <section className="home-tools" aria-label={t('What you can do here')}>
    <article className="tool-card">
      <h2><T text="Watchlists"/></h2>
      <p><T text="Follow your stock ideas from the day you add them, with optional share counts and costs."/></p>
      <PreviewFrame label={t('Example watchlist · since 2021')} ready={picks.length>0} empty={t('Loading prices…')}>
        <li className="tool-preview-head"><span>{t('Symbol')}</span><span>{t('Price')}</span><span>{t('Since added')}</span></li>
        {picks.map(stock=><li key={stock.symbol}>
          <CompanyIcon symbol={stock.symbol}/>
          <span className="tool-preview-copy"><span className="tool-preview-name">{stock.symbol}</span><span className="tool-preview-sub">{stock.companyName}</span></span>
          <span className="tool-preview-sub">{price(stock.currentPrice,stock.currency)}</span>
          <span className={'tool-preview-value '+tone(stock.changePercent)}>{pct(stock.changePercent)}</span>
        </li>)}
      </PreviewFrame>
      <a className="tool-link" href="/watchlists"><T text="Build a watchlist"/><ArrowUpRight size={16}/></a>
    </article>
    <article className="tool-card">
      <h2><T text="Markets"/></h2>
      <p><T text="Indexes, sectors, crypto and ETFs across the US, Europe, Canada and global markets."/></p>
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
      <PreviewFrame label={t(earnings?.label||'Reporting this week')} ready={!!earnings&&earnings.rows.length>0} empty={earnings?t('No upcoming reports this week or next.'):t('Loading the calendar…')}>
        {(earnings?.rows||[]).map(row=><li key={row.symbol+row.date}>
          <CompanyIcon symbol={row.symbol}/>
          <span className="tool-preview-name">{row.symbol}</span>
          <span className="tool-preview-value">{dayLabel(row.date)}</span>
        </li>)}
      </PreviewFrame>
      <a className="tool-link" href="/earnings"><T text="View earnings"/><ArrowUpRight size={16}/></a>
    </article>
  </section>;
}
