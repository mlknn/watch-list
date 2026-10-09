'use client';
import {useEffect,useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {useT} from '@/components/product/language';
import {CompanyIcon} from './company-icon';
import {price} from '@/lib/watchlist';

type Row={rank:number;symbol:string;name:string;marketCap:number;price:number|null;currency:string;changePercent:number|null};
type Page={range:string;offset:number;nextOffset:number|null;total:number;asOf:string;startDate:string;rows:Row[]};
type Data=Page;

export function MarketHistoryPage(){
  const t=useT();
  const [range,setRange]=useState('ytd');
  const [data,setData]=useState<Data|null>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let alive=true;
    setData(null);setStatus('loading');
    void(async()=>{
      try{
        let offset:number|null=0,combined:Data|null=null;
        while(offset!==null){
          const response=await fetch(`/api/market-history?range=${range}&offset=${offset}`);
          const result=await response.json() as Page&{error?:string};
          if(!response.ok)throw Error(result.error||'Market history is temporarily unavailable.');
          combined=combined?{...result,rows:[...combined.rows,...result.rows]}:result;
          if(alive)setData(combined);
          offset=result.nextOffset;
        }
        if(alive)setStatus('ready');
      }catch{if(alive)setStatus('error');}
    })();
    return()=>{alive=false;};
  },[range,attempt]);
  return <main className="market-history-page">
    <header className="market-history-page-heading"><p className="eyebrow">{t('MARKET HISTORY')}</p><h1>{t('The market’s biggest companies, over time')}</h1><p>{t('Compare today’s 100 largest US companies with their prices at the beginning of this year or 1, 2, 5, or 10 years ago.')}</p></header>
    <section className="home-history" aria-label={t('Market history')}>
      <div className="home-history-main">
        <header className="home-history-heading"><div><p className="eyebrow">{t('THE LARGEST PUBLIC COMPANIES')}</p><h2>{t('Top 100 by market cap')}</h2><p>{t('Ranked by current market value. Returns compare adjusted share prices.')}</p></div><span>{data?.asOf?`${t('As of')} ${new Date(data.asOf).toLocaleDateString()}`:''}</span></header>
        {status==='loading'&&!data?<div className="home-history-loading" role="status"><LoaderCircle className="spin"/>{t('Loading market history…')}</div>:status==='error'&&!data?<p className="home-panel-status" role="alert">{t('Market history is temporarily unavailable.')}<button type="button" className="home-inline-retry" onClick={()=>setAttempt(value=>value+1)}>{t('Retry')}</button></p>:<div className="home-history-scroll" role="region" aria-label={t('Top 100 companies by market capitalization')} tabIndex={0}><table className="home-history-table"><caption className="sr-only">{t('Top 100 by market cap')}</caption><thead><tr><th scope="col">#</th><th scope="col">{t('Company')}</th><th scope="col">{t('Market cap')}</th><th scope="col">{t('Price now')}</th><th scope="col">{t('Change')}</th></tr></thead><tbody>{data?.rows.map(row=><tr key={row.symbol}><td>{row.rank}</td><th scope="row"><a href={'/stocks/'+encodeURIComponent(row.symbol)}><CompanyIcon symbol={row.symbol}/><span><strong>{row.symbol}</strong><small>{row.name}</small></span></a></th><td>{formatMarketCap(row.marketCap)}</td><td>{row.price===null?'—':price(row.price,row.currency)}</td><td className={row.changePercent===null?'':row.changePercent>=0?'up':'down'}>{formatPercent(row.changePercent)}</td></tr>)}</tbody></table></div>}
        {status==='error'&&data&&<p className="home-panel-status" role="alert">{t('Some market history is unavailable.')}<button type="button" className="home-inline-retry" onClick={()=>setAttempt(value=>value+1)}>{t('Retry')}</button></p>}
        {status==='loading'&&data&&data.rows.length<100&&<p className="home-history-refresh" role="status"><LoaderCircle className="spin" size={14}/>{t('Loading the rest of the top 100…')}</p>}
        <p className="home-history-source">{t('Source: Yahoo Finance. Market caps and quotes may be delayed. Historical returns use split-adjusted prices and exclude dividends; missing history is shown as unavailable.')}</p>
      </div>
      <aside className="home-history-controls"><p className="eyebrow">{t('COMPARE FROM')}</p><h3>{t('Choose a starting point')}</h3><p>{t('See how today’s largest companies have changed since a selected date.')}</p><label htmlFor="market-history-range">{t('Period')}</label><select id="market-history-range" value={range} onChange={event=>setRange(event.target.value)}><option value="ytd">{t('Beginning of this year')}</option><option value="1y">{t('1 year ago')}</option><option value="2y">{t('2 years ago')}</option><option value="5y">{t('5 years ago')}</option><option value="10y">{t('10 years ago')}</option></select>{data&&<div className="home-history-selected"><span>{t('Starting date')}</span><strong>{new Date(data.startDate+'T12:00:00Z').toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}</strong><span>{t('Companies ranked by current market cap')}</span></div>}{status==='loading'&&data&&<small className="home-history-refresh" role="status"><LoaderCircle className="spin" size={14}/>{t('Updating selected period…')}</small>}</aside>
    </section>
  </main>;
}

function formatMarketCap(value:number){
  if(!Number.isFinite(value)||value<=0)return '—';
  const units:[number,string][]=[[1e12,'T'],[1e9,'B'],[1e6,'M']];
  const [scale,suffix]=units.find(([threshold])=>value>=threshold)||[1,''];
  return `$${(value/scale).toLocaleString(undefined,{maximumFractionDigits:2})}${suffix}`;
}
function formatPercent(value:number|null){return value===null?'—':`${value>=0?'+':''}${value.toFixed(2)}%`;}
