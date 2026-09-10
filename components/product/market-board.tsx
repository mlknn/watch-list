'use client';
import {useEffect,useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {PriceChart} from './price-chart';
import {CompanyIcon} from './company-icon';
import {price} from '@/lib/watchlist';
import {type MarketChart} from '@/lib/market';

type Row={symbol:string;name?:string;chart:MarketChart|null;error:string|null};
type Board={fetchedAt:string;indices:(Row&{name:string})[];groups:{id:string;title:string;blurb:string;stocks:Row[]}[]};

function Change({chart}:{chart:MarketChart}){
  const pct=chart.quote.changePercent;
  const up=(pct??0)>=0;
  return <span className={up?'up':'down'}>{pct===null?'—':`${up?'+':''}${pct.toFixed(2)}%`}</span>;
}

function IndexCard({row}:{row:Row&{name:string}}){
  return <article className="market-index-card">
    <div className="market-index-head">
      <div><p className="eyebrow">{row.symbol.replace('^','')}</p><h2>{row.name}</h2></div>
      {row.chart?<div className="market-index-quote"><strong>{price(row.chart.quote.price,row.chart.currency)}</strong><Change chart={row.chart}/></div>:<p className="market-card-error">{row.error||'Loading…'}</p>}
    </div>
    {row.chart?<PriceChart data={row.chart} compact/>:<div className="mini-chart-empty">Chart unavailable.</div>}
  </article>;
}

function StockCard({row}:{row:Row}){
  const chart=row.chart;
  const inner=<>
    <div className="market-stock-head"><CompanyIcon symbol={row.symbol}/><div><strong>{chart?.companyName||row.symbol}</strong><small>{row.symbol}</small></div>{chart&&<div className="market-stock-quote"><b>{price(chart.quote.price,chart.currency)}</b><Change chart={chart}/></div>}</div>
    {chart?<PriceChart data={chart} compact/>:<p className="market-card-error">{row.error||'Unavailable'}</p>}
  </>;
  if(row.symbol.startsWith('^'))return <article className="market-stock-card">{inner}</article>;
  return <a className="market-stock-card" href={'/stocks/'+encodeURIComponent(row.symbol)}>{inner}</a>;
}

export function MarketBoard(){
  const [data,setData]=useState<Board|null>(null),[error,setError]=useState('');
  useEffect(()=>{let alive=true,running=false;
    async function load(){if(running)return;running=true;try{const response=await fetch('/api/market',{cache:'no-store'});const result=await response.json() as Board&{error?:string};if(!response.ok)throw Error(result.error||'Market data is temporarily unavailable.');if(alive){setData(result);setError('');}}catch(e){if(alive)setError((e as Error).message);}finally{running=false;}}
    void load();
    const timer=setInterval(()=>{if(!document.hidden)void load();},60000);
    return()=>{alive=false;clearInterval(timer);};
  },[]);
  return <main className="market-page">
    <div className="page-heading"><div><p className="eyebrow">MARKETS, IN ONE PLACE</p><h1>Today’s tape.</h1><p className="intro">S&amp;P 500, Nasdaq and Dow Jones, then a scroll through technology, finance and the rest of the tape. No account needed to look.</p></div></div>
    {error&&!data&&<p className="error-banner" role="alert">{error}</p>}
    {!data&&!error&&<div className="market-loading" role="status"><LoaderCircle className="spin"/>Loading live market charts…</div>}
    {data&&<><section className="market-indices" aria-label="Major US indexes">{data.indices.map(row=><IndexCard key={row.symbol} row={row}/>)}</section>
    {data.groups.map((group,index)=><section key={group.id} id={group.id} className="market-group"><div className="market-group-copy"><p className="eyebrow">{String(index+1).padStart(2,'0')}</p><h2>{group.title}</h2><p>{group.blurb}</p></div><div className="market-stock-grid">{group.stocks.map(row=><StockCard key={row.symbol} row={row}/>)}</div></section>)}
    <p className="market-footnote">Yahoo Finance · Quotes may be delayed · Updated {new Date(data.fetchedAt).toLocaleString()}. Charts are for looking, not advice.</p></>}
  </main>;
}
