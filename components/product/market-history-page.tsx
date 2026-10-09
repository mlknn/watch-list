'use client';
import {useEffect,useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {useT} from '@/components/product/language';
import {CompanyIcon} from './company-icon';

type Row={rank:number;symbol:string;name:string;marketCap:number;historicalMarketCap:number|null;changePercent:number|null;historyStatus:'available'|'not-listed'|'unavailable'};
type Page={range:string;offset:number;nextOffset:number|null;total:number;asOf:string;startDate:string;rows:Row[]};
type Data=Page;
type Connector={symbol:string;x1:number;y1:number;x2:number;y2:number;color:string};

function useMarketHistory(range:string,enabled=true){
  const [data,setData]=useState<Data|null>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    let alive=true;setData(null);setStatus('loading');
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
  },[range,attempt,enabled]);
  return {data,status,retry:()=>setAttempt(value=>value+1)};
}

export function MarketHistoryPage(){
  const t=useT();
  const [range,setRange]=useState('ytd');
  const [selected,setSelected]=useState<{symbol:string;from:'current'|'historical'}|null>(null);
  const [connectors,setConnectors]=useState<Connector[]>([]);
  const current=useMarketHistory('ytd');
  const historical=useMarketHistory(range,range!=='ytd');
  const otherData=range==='ytd'?current.data:historical.data;
  const otherStatus=range==='ytd'?current.status:historical.status;
  const historicalRows=(otherData?.rows||[]).slice().sort((a,b)=>(b.historicalMarketCap??-1)-(a.historicalMarketCap??-1)||a.symbol.localeCompare(b.symbol)).map((row,index)=>({...row,rank:index+1}));

  useEffect(()=>{
    if(!selected)return;
    const target=selected.from==='current'?'historical':'current';
    document.getElementById(`${target}-${selected.symbol}`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center',inline:'nearest'});
  },[selected,current.data?.rows.length,otherData?.rows.length,range]);

  useEffect(()=>{
    let frame=0;
    const update=()=>{
      if(!window.matchMedia('(min-width: 641px)').matches){setConnectors([]);return;}
      const symbols=new Set((current.data?.rows||[]).slice(0,10).map(row=>row.symbol));
      if(selected)symbols.add(selected.symbol);
      const next:Connector[]=[];
      for(const symbol of symbols){
        const left=document.getElementById(`current-${symbol}`),right=document.getElementById(`historical-${symbol}`);
        if(!left||!right)continue;
        const a=left.getBoundingClientRect(),b=right.getBoundingClientRect();
        next.push({symbol,x1:a.right-1,y1:a.top+a.height/2,x2:b.left+1,y2:b.top+b.height/2,color:`hsl(${colorFor(symbol)} 78% 50%)`});
      }
      setConnectors(next);
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
    schedule();window.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);};
  },[selected,current.data?.rows.length,otherData?.rows.length,range]);

  const retry=range==='ytd'?current.retry:historical.retry;
  return <main className="market-history-page">
    <div className="market-history-columns">
      <section className="market-history-side" aria-label={t('Current market capitalization')}>
        <header className="market-history-side-heading"><div><p className="eyebrow">{t('CURRENT')}</p><h1>{t('Market cap today')}</h1></div><span>{current.data?.asOf?`${t('As of')} ${new Date(current.data.asOf).toLocaleDateString()}`:''}</span></header>
        <HistoryTable rows={current.data?.rows||[]} loading={current.status==='loading'&&!current.data} error={current.status==='error'&&!current.data} selectedSymbol={selected?.symbol||''} side="current" onSelect={symbol=>setSelected({symbol,from:'current'})} retry={current.retry} caption={t('Top 100 companies by current market cap')} formatValue={row=>formatCap(row.marketCap)} formatChange={row=>formatHistoryStatus(t,row,'current')}/>
      </section>
      <section className="market-history-side" aria-label={t('Historical market capitalization')}>
        <header className="market-history-side-heading historical-heading"><div><p className="eyebrow">{t('HISTORICAL')}</p><h2>{t('Market cap at a past date')}</h2></div><label className="market-history-select"><span>{t('Compare from')}</span><select value={range} onChange={event=>setRange(event.target.value)}><option value="ytd">{t('Beginning of this year')}</option><option value="1y">{t('1 year ago')}</option><option value="2y">{t('2 years ago')}</option><option value="5y">{t('5 years ago')}</option><option value="10y">{t('10 years ago')}</option></select></label></header>
        {otherData&&<p className="market-history-date">{t('Estimated market caps at')} {new Date(otherData.startDate+'T12:00:00Z').toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})} · {t('Ranked at that date')}</p>}
        <HistoryTable rows={historicalRows} loading={otherStatus==='loading'&&!otherData} error={otherStatus==='error'&&!otherData} selectedSymbol={selected?.symbol||''} side="historical" onSelect={symbol=>setSelected({symbol,from:'historical'})} retry={retry} caption={t('Top companies by estimated market cap at the selected date')} formatValue={row=>row.historicalMarketCap===null?'—':formatCap(row.historicalMarketCap)} formatChange={row=>formatHistoryStatus(t,row,'historical')}/>
        {otherStatus==='loading'&&otherData&&otherData.rows.length<100&&<p className="home-history-refresh" role="status"><LoaderCircle className="spin" size={14}/>{t('Loading the rest of the top 100…')}</p>}
      </section>
    </div>
    {connectors.length>0&&<svg className="market-history-connector" aria-hidden="true">{connectors.map(connector=><path key={connector.symbol} d={`M${connector.x1} ${connector.y1} C${(connector.x1+connector.x2)/2} ${connector.y1}, ${(connector.x1+connector.x2)/2} ${connector.y2}, ${connector.x2} ${connector.y2}`} fill="none" stroke={connector.color} strokeWidth={connector.symbol===selected?.symbol?2.5:1.5} strokeOpacity={connector.symbol===selected?.symbol?1:.68}/>)}</svg>}
    <p className="market-history-source">{t('Source: Yahoo Finance. Market caps and quotes may be delayed. Past market caps are estimates based on today’s shares outstanding and split-adjusted prices; returns exclude dividends.')}</p>
  </main>;
}

function HistoryTable({rows,loading,error,selectedSymbol,side,onSelect,retry,caption,formatValue,formatChange}:{rows:Row[];loading:boolean;error:boolean;selectedSymbol:string;side:'current'|'historical';onSelect:(symbol:string)=>void;retry:()=>void;caption:string;formatValue:(row:Row)=>string;formatChange:(row:Row)=>string}){
  const t=useT();
  if(loading)return <div className="market-history-loading" role="status"><LoaderCircle className="spin"/>{t('Loading market history…')}</div>;
  if(error)return <p className="home-panel-status" role="alert">{t('Market history is temporarily unavailable.')}<button type="button" className="home-inline-retry" onClick={retry}>{t('Retry')}</button></p>;
  return <div className="market-history-table-wrap"><table className="home-history-table market-history-table"><caption className="sr-only">{caption}</caption><thead><tr><th scope="col">#</th><th scope="col">{t('Company')}</th><th scope="col">{t('Market cap')} <small>({t(side==='current'?'YTD change':'Change since selected date')})</small></th></tr></thead><tbody>{rows.map(row=><tr id={`${side}-${row.symbol}`} key={row.symbol} className={selectedSymbol===row.symbol?'is-selected':''} onClick={()=>onSelect(row.symbol)}><td>{row.rank}</td><th scope="row"><button type="button" className="market-history-company" aria-pressed={selectedSymbol===row.symbol} onClick={()=>onSelect(row.symbol)}><CompanyIcon symbol={row.symbol}/><span><strong>{row.symbol}</strong><small>{row.name}</small></span></button></th><td>{side==='historical'&&row.historyStatus!=='available'?<span className="market-history-missing">{formatChange(row)}</span>:<><strong>{formatValue(row)}</strong> <span className={'market-history-change '+(row.changePercent===null?'':row.changePercent>=0?'up':'down')}>({formatChange(row)})</span></>}</td></tr>)}</tbody></table></div>;
}

function formatCap(value:number){
  if(!Number.isFinite(value)||value<=0)return '—';
  const units:[number,string][]=[[1e12,'T'],[1e9,'B'],[1e6,'M']];
  const [scale,suffix]=units.find(([threshold])=>value>=threshold)||[1,''];
  return `$${(value/scale).toLocaleString(undefined,{maximumFractionDigits:2})}${suffix}`;
}
function formatPercent(value:number|null){return value===null?'—':`${value>=0?'+':''}${value.toFixed(2)}%`;}
function colorFor(symbol:string){let hash=0;for(const char of symbol)hash=(hash*31+char.charCodeAt(0))%360;return hash;}
function formatHistoryStatus(t:(value:string)=>string,row:Row,side:'current'|'historical'){
  if(row.historyStatus==='not-listed')return t(side==='current'?'Not listed at the start of this year':'Not listed by this date');
  if(row.historyStatus==='unavailable')return t('Historical data unavailable');
  return formatPercent(row.changePercent);
}
