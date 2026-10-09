'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDown,ArrowDownRight,ArrowUp,ArrowUpRight,ExternalLink,LoaderCircle,Plus,Search,TrendingDown,TrendingUp,X} from 'lucide-react';
import {useT} from '@/components/product/language';
import {CompanyIcon} from './company-icon';

type Range='ytd'|'1y'|'2y'|'5y'|'10y';
type ApiRow={rank:number;symbol:string;name:string;marketCap:number;historicalMarketCap:number|null;changePercent:number|null;historyStatus:'available'|'not-listed'|'unavailable'};
type Page={range:string;offset:number;nextOffset:number|null;total:number;asOf:string;startDate:string;rows:ApiRow[]};
type View='current'|'historical';
type CompareRow={symbol:string;name:string;rankToday:number|null;rankThen:number|null;rankDelta:number|null;marketCap:number|null;historicalMarketCap:number|null;changePercent:number|null;historyStatus:'available'|'not-listed'|'unavailable'|'outside';isEntrant:boolean;isExit:boolean};
type SortKey='rankToday'|'rankThen'|'rankDelta'|'name'|'marketCap'|'historicalMarketCap'|'changePercent';
type Insight='climbers'|'fallers'|'gainers'|'losers'|'entrants'|'exits'|null;

const ranges:{value:Range;label:string}[]=[{value:'ytd',label:'Beginning of this year'},{value:'1y',label:'1 year ago'},{value:'2y',label:'2 years ago'},{value:'5y',label:'5 years ago'},{value:'10y',label:'10 years ago'}];

function useMarketHistory(range:Range,view:View){
  const [data,setData]=useState<Page|null>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let alive=true;const controller=new AbortController();setData(null);setStatus('loading');
    void(async()=>{
      try{
        let offset:number|null=0,combined:Page|null=null;
        while(offset!==null&&alive){
          const response=await fetch(`/api/market-history?range=${range}&offset=${offset}&view=${view}`,{signal:controller.signal});
          const result=await response.json() as Page&{error?:string};
          if(!response.ok)throw Error(result.error||'Market history is temporarily unavailable.');
          combined=combined?{...result,rows:[...combined.rows,...result.rows]}:result;
          if(alive)setData(combined);
          offset=result.nextOffset;
        }
        if(alive)setStatus('ready');
      }catch{if(alive)setStatus('error');}
    })();
    return()=>{alive=false;controller.abort();};
  },[range,view,attempt]);
  return {data,status,retry:()=>setAttempt(value=>value+1)};
}

export function MarketHistoryPage(){
  const t=useT();
  const [range,setRange]=useState<Range>('ytd');
  const [rangeReady,setRangeReady]=useState(false);
  const [query,setQuery]=useState('');
  const [onlyWithHistory,setOnlyWithHistory]=useState(false);
  const [onlyMovers,setOnlyMovers]=useState(false);
  const [insight,setInsight]=useState<Insight>(null);
  const [sort,setSort]=useState<{key:SortKey;direction:'asc'|'desc'}>({key:'rankToday',direction:'asc'});
  const [selectedSymbol,setSelectedSymbol]=useState('');
  const current=useMarketHistory(range,'current');
  const historical=useMarketHistory(range,'historical');
  const panelRef=useRef<HTMLElement>(null);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search),value=params.get('range');
    if(ranges.some(option=>option.value===value))setRange(value as Range);
    setRangeReady(true);
  },[]);
  useEffect(()=>{
    if(!rangeReady)return;
    const url=new URL(window.location.href);url.searchParams.set('range',range);window.history.replaceState(window.history.state,'',url);
  },[range,rangeReady]);
  useEffect(()=>{
    if(!selectedSymbol)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){document.getElementById(`company-${selectedSymbol}`)?.focus();setSelectedSymbol('');}};
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[selectedSymbol]);
  useEffect(()=>{if(selectedSymbol)panelRef.current?.focus();},[selectedSymbol]);

  const rows=useMemo(()=>{
    const today=current.data?.rows||[],candidates=historical.data?.rows||[];
    const then=candidates.filter(row=>row.historicalMarketCap!==null).slice().sort((a,b)=>(b.historicalMarketCap||0)-(a.historicalMarketCap||0)).slice(0,100).map((row,index)=>({...row,rank:index+1}));
    const todayBySymbol=new Map(today.map(row=>[row.symbol,row])),thenBySymbol=new Map(then.map(row=>[row.symbol,row])),candidateBySymbol=new Map(candidates.map(row=>[row.symbol,row]));
    const symbols=new Set([...todayBySymbol.keys(),...thenBySymbol.keys()]);
    return [...symbols].map(symbol=>{
      const now=todayBySymbol.get(symbol),past=thenBySymbol.get(symbol);
      const rankToday=now?.rank??null,rankThen=past?.rank??null;
      const historyStatus=past?'available':now?.historyStatus==='not-listed'?'not-listed':now?.historyStatus==='unavailable'?'unavailable':now?'outside':'available';
      const candidate=candidateBySymbol.get(symbol);
      return {symbol,name:now?.name||past?.name||candidate?.name||symbol,rankToday,rankThen,rankDelta:rankToday!==null&&rankThen!==null?rankThen-rankToday:null,marketCap:now?.marketCap??past?.marketCap??candidate?.marketCap??null,historicalMarketCap:past?.historicalMarketCap??candidate?.historicalMarketCap??now?.historicalMarketCap??null,changePercent:now?.changePercent??past?.changePercent??candidate?.changePercent??null,historyStatus,isEntrant:!!now&&!past&&historyStatus==='outside',isExit:!!past&&!now} satisfies CompareRow;
    });
  },[current.data?.rows,historical.data?.rows]);

  const shown=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    const chosen=rows.filter(row=>{
      if(needle&&!`${row.symbol} ${row.name}`.toLowerCase().includes(needle))return false;
      if(onlyWithHistory&&row.historyStatus!=='available')return false;
      if(onlyMovers&&(row.rankDelta===null||Math.abs(row.rankDelta)<5))return false;
      if(insight==='climbers'&&(row.rankDelta===null||row.rankDelta<=0))return false;
      if(insight==='fallers'&&(row.rankDelta===null||row.rankDelta>=0))return false;
      if(insight==='gainers'&&(row.changePercent===null||row.changePercent<=0))return false;
      if(insight==='losers'&&(row.changePercent===null||row.changePercent>=0))return false;
      if(insight==='entrants'&&!row.isEntrant)return false;
      if(insight==='exits'&&!row.isExit)return false;
      return true;
    });
    return chosen.sort((a,b)=>{
      const first=a[sort.key],second=b[sort.key];
      if(first===null)return 1;if(second===null)return -1;
      let order=typeof first==='string'?first.localeCompare(String(second)):(first as number)-(second as number);
      if(sort.direction==='desc')order=-order;
      return order||a.symbol.localeCompare(b.symbol);
    });
  },[rows,query,onlyWithHistory,onlyMovers,insight,sort]);
  useEffect(()=>{if(selectedSymbol&&!shown.some(row=>row.symbol===selectedSymbol))setSelectedSymbol('');},[selectedSymbol,shown]);

  const movers=rows.filter(row=>row.rankDelta!==null),withReturns=rows.filter(row=>row.changePercent!==null);
  const climber=movers.filter(row=>row.rankDelta!>0).sort((a,b)=>(b.rankDelta||0)-(a.rankDelta||0))[0];
  const faller=movers.filter(row=>row.rankDelta!<0).sort((a,b)=>(a.rankDelta||0)-(b.rankDelta||0))[0];
  const gainer=withReturns.slice().sort((a,b)=>(b.changePercent||0)-(a.changePercent||0))[0];
  const loser=withReturns.slice().sort((a,b)=>(a.changePercent||0)-(b.changePercent||0))[0];
  const entrants=rows.filter(row=>row.isEntrant),exits=rows.filter(row=>row.isExit);
  const isLoading=!rangeReady||current.status==='loading'||historical.status==='loading';
  const hasError=current.status==='error'||historical.status==='error';
  const selected=rows.find(row=>row.symbol===selectedSymbol)||null;
  const retry=()=>{current.retry();historical.retry();};

  function changeSort(key:SortKey){setSort(value=>value.key===key?{key,direction:value.direction==='asc'?'desc':'asc'}:{key,direction:key==='rankToday'||key==='rankThen'||key==='name'?'asc':'desc'});}
  const sortButton=(key:SortKey,label:string)=><button type="button" className="mh-sort" onClick={()=>changeSort(key)} aria-label={`${t('Sort by')} ${t(label)}`}>{t(label)}{sort.key===key&&(sort.direction==='asc'?<ArrowUp size={12}/>:<ArrowDown size={12}/>)}</button>;
  const chooseInsight=(value:Insight)=>setInsight(old=>old===value?null:value);

  return <main className="market-history-page mh-page">
    <header className="mh-heading"><div><p className="eyebrow">{t('MARKET HISTORY')}</p><h1>{t('Who rose and fell among the giants?')}</h1><p>{t('Compare today’s largest US companies with their estimated rank and market cap at a past date.')}</p></div><span className="mh-asof">{current.data?.asOf?`${t('Market data as of')} ${new Date(current.data.asOf).toLocaleDateString()}`:''}</span></header>

    {isLoading?<HistorySkeleton/>:hasError?<section className="mh-state" role="alert"><h2>{t('Market history could not load')}</h2><p>{t('Please check your connection and try again.')}</p><button type="button" className="mh-primary" onClick={retry}><LoaderCircle size={15}/>{t('Retry')}</button></section>:<>
      <section className="mh-insights" aria-label={t('Market history insights')}>
        <InsightCard icon={<TrendingUp/>} label={t('Biggest rank climber')} row={climber} value={climber?`↑ ${climber.rankDelta}`:t('No rank change')} tone="up" onClick={()=>chooseInsight('climbers')} active={insight==='climbers'}/>
        <InsightCard icon={<TrendingDown/>} label={t('Biggest rank faller')} row={faller} value={faller?`↓ ${Math.abs(faller.rankDelta||0)}`:t('No rank change')} tone="down" onClick={()=>chooseInsight('fallers')} active={insight==='fallers'}/>
        <InsightCard icon={<ArrowUpRight/>} label={t('Largest % gainer')} row={gainer} value={gainer?formatPercent(gainer.changePercent):'—'} tone="up" onClick={()=>chooseInsight('gainers')} active={insight==='gainers'}/>
        <InsightCard icon={<ArrowDownRight/>} label={t('Largest % loser')} row={loser} value={loser?formatPercent(loser.changePercent):'—'} tone="down" onClick={()=>chooseInsight('losers')} active={insight==='losers'}/>
        <InsightCard icon={<Plus/>} label={t('New entrants')} row={null} value={`${entrants.length} ${t('names')}`} tone="neutral" onClick={()=>chooseInsight('entrants')} active={insight==='entrants'}/>
        <InsightCard icon={<ArrowDown/>} label={t('Top-100 exits')} row={null} value={`${exits.length} ${t('names')}`} tone="neutral" onClick={()=>chooseInsight('exits')} active={insight==='exits'}/>
      </section>

      <section className="mh-controls" aria-label={t('Filter and search market history')}>
        <label className="mh-range"><span>{t('Compare from')}</span><select value={range} onChange={event=>{setRange(event.target.value as Range);setInsight(null);setSelectedSymbol('');}}>{ranges.map(option=><option key={option.value} value={option.value}>{t(option.label)}</option>)}</select></label>
        <label className="mh-search"><Search size={17}/><span className="sr-only">{t('Search ticker or company')}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={t('Search ticker or company')}/>{query&&<button type="button" aria-label={t('Clear search')} onClick={()=>setQuery('')}><X size={15}/></button>}</label>
        <label className="mh-toggle"><input type="checkbox" checked={onlyWithHistory} onChange={event=>setOnlyWithHistory(event.target.checked)}/><span>{t('Historical data only')}</span></label>
        <label className="mh-toggle"><input type="checkbox" checked={onlyMovers} onChange={event=>setOnlyMovers(event.target.checked)}/><span>{t('Rank movers ≥ 5')}</span></label>
      </section>

      <div className="mh-summary" aria-live="polite"><strong>{shown.length} {t('names shown')}</strong><span>{climber?`${t('Top climber')}: ${climber.symbol} +${climber.rankDelta}`:''}</span><span>{faller?`${t('Top faller')}: ${faller.symbol} −${Math.abs(faller.rankDelta||0)}`:''}</span><span>{gainer?`${t('Top gainer')}: ${gainer.symbol} ${formatPercent(gainer.changePercent)}`:''}</span><span>{loser?`${t('Top loser')}: ${loser.symbol} ${formatPercent(loser.changePercent)}`:''}</span></div>

      {insight&&<div className="mh-filter-note">{t('Filtered by insight')}<button type="button" onClick={()=>setInsight(null)}>{t('Clear filter')} <X size={13}/></button></div>}
      {shown.length===0?<div className="mh-empty"><h2>{t('No companies match these filters')}</h2><p>{t('Try another search or clear one of the filters.')}</p><button type="button" onClick={()=>{setQuery('');setOnlyWithHistory(false);setOnlyMovers(false);setInsight(null);}}>{t('Clear filters')}</button></div>:<>
        <div className="mh-table-wrap"><table className="mh-table"><caption className="sr-only">{t('Top companies ranked today and at the selected past date')}</caption><thead><tr>{(['rankToday','rankThen','rankDelta','name','marketCap','historicalMarketCap','changePercent'] as SortKey[]).map((key,index)=>{const labels=['Rank today','Rank then','Δ Rank','Company','Market cap today','Market cap then','Change since date'];return <th key={key} aria-sort={sort.key===key?sort.direction==='asc'?'ascending':'descending':'none'}>{sortButton(key,labels[index])}</th>;})}</tr></thead><tbody>{shown.map(row=><tr key={row.symbol} className={selectedSymbol===row.symbol?'is-selected':''}>
          <td className="mh-rank">{row.rankToday??<span className="mh-chip">{t('Outside today’s top 100')}</span>}</td><td className="mh-rank">{row.rankThen??<MissingChip row={row} t={t}/>}</td><td><RankDelta value={row.rankDelta} t={t}/></td><th scope="row"><button id={`company-${row.symbol}`} className="mh-company" type="button" aria-expanded={selectedSymbol===row.symbol} aria-controls="market-history-details" onClick={()=>setSelectedSymbol(old=>old===row.symbol?'':row.symbol)}><CompanyIcon symbol={row.symbol}/><span><strong>{row.symbol}</strong><small>{row.name}</small></span></button></th><td className="mh-cap">{row.marketCap===null?'—':formatCap(row.marketCap)}</td><td className="mh-cap">{row.historicalMarketCap===null?<MissingChip row={row} t={t}/>:formatCap(row.historicalMarketCap)}</td><td><ChangeValue value={row.changePercent} status={row.historyStatus} t={t}/></td>
        </tr>)}</tbody></table></div>
        <div className="mh-cards">{shown.map(row=><article key={row.symbol} className={`mh-card ${selectedSymbol===row.symbol?'is-selected':''}`}><button type="button" className="mh-card-head" aria-expanded={selectedSymbol===row.symbol} aria-controls="market-history-details" onClick={()=>setSelectedSymbol(old=>old===row.symbol?'':row.symbol)}><CompanyIcon symbol={row.symbol}/><span><strong>{row.symbol}</strong><small>{row.name}</small></span><RankDelta value={row.rankDelta} t={t}/></button><div className="mh-card-grid"><span>{t('Rank today')}<strong>{row.rankToday??'—'}</strong></span><span>{t('Rank then')}<strong>{row.rankThen??<MissingChip row={row} t={t}/>}</strong></span><span>{t('Market cap today')}<strong>{row.marketCap===null?'—':formatCap(row.marketCap)}</strong></span><span>{t('Market cap then')}<strong>{row.historicalMarketCap===null?<MissingChip row={row} t={t}/>:formatCap(row.historicalMarketCap)}</strong></span><span>{t('Change since date')}<strong><ChangeValue value={row.changePercent} status={row.historyStatus} t={t}/></strong></span></div></article>)}</div>
      </>}
      {selected&&<aside id="market-history-details" className="mh-detail" ref={panelRef} tabIndex={-1} aria-label={`${selected.symbol} ${t('comparison details')}`}><div className="mh-detail-heading"><div><CompanyIcon symbol={selected.symbol}/><div><strong>{selected.symbol}</strong><span>{selected.name}</span></div></div><button type="button" aria-label={t('Close details')} onClick={()=>{setSelectedSymbol('');document.getElementById(`company-${selected.symbol}`)?.focus();}}><X size={18}/></button></div><div className="mh-detail-stats"><span>{t('Market cap today')}<strong>{selected.marketCap===null?'—':formatCap(selected.marketCap)}</strong></span><span>{t('Market cap then')}<strong>{selected.historicalMarketCap===null?'—':formatCap(selected.historicalMarketCap)}</strong></span><span>{t('Change since date')}<strong><ChangeValue value={selected.changePercent} status={selected.historyStatus} t={t}/></strong></span><span>{t('Rank today / then')}<strong>{selected.rankToday??'—'} / {selected.rankThen??'—'}</strong></span></div><p className="mh-detail-freeze">{t('Add this company to a watchlist. Its latest available price will be recorded as the starting price.')}</p><div className="mh-detail-actions"><a className="mh-primary" href={`/stocks/${encodeURIComponent(selected.symbol)}?from=${encodeURIComponent('/history?range='+range)}&add=1`}><Plus size={16}/>{t('Add to my watchlist')}</a><a className="mh-secondary" href={`/stocks/${encodeURIComponent(selected.symbol)}?from=${encodeURIComponent('/history?range='+range)}`}>{t('View company')}<ExternalLink size={15}/></a></div></aside>}

      <details className="mh-methodology"><summary>{t('How this data is calculated')}</summary><p>{t('Source: Yahoo Finance. Historical rankings are estimates from a broader sample of today’s largest listed companies, using today’s shares outstanding and split-adjusted prices. Companies no longer listed and historical share-count changes may be missing; returns exclude dividends. Market caps and quotes may be delayed.')}</p></details>
    </>}
  </main>;
}

function InsightCard({icon,label,row,value,tone,onClick,active}:{icon:React.ReactNode;label:string;row:CompareRow|null;value:string;tone:'up'|'down'|'neutral';onClick:()=>void;active:boolean}){
  return <div className={`mh-insight ${tone} ${active?'active':''}`}><button type="button" onClick={onClick} aria-pressed={active}><span className="mh-insight-icon">{icon}</span><span className="mh-insight-copy"><small>{label}</small><strong>{row?row.symbol:value}</strong>{row&&<em>{value}</em>}</span></button></div>;
}
function HistorySkeleton(){return <div className="mh-loading" role="status" aria-label="Loading market history"><div className="mh-skeleton-strip">{Array.from({length:5},(_,i)=><span key={i}/>)}</div><div className="mh-skeleton-controls"/><div className="mh-skeleton-table">{Array.from({length:12},(_,i)=><span key={i}/>)}</div><span className="sr-only">Loading market history…</span></div>;}
function MissingChip({row,t}:{row:CompareRow;t:(value:string)=>string}){const label=row.historyStatus==='not-listed'?'Not listed then':row.historyStatus==='unavailable'?'Data unavailable':'Outside top 100 then';return <span className={`mh-chip ${row.historyStatus}`}>{t(label)}</span>;}
function RankDelta({value,t}:{value:number|null;t:(value:string)=>string}){if(value===null)return <span className="mh-neutral">—</span>;if(value===0)return <span className="mh-neutral">{t('No change')}</span>;const improved=value>0;return <span className={`mh-delta ${improved?'up':'down'}`} aria-label={`${improved?t('Up'):t('Down')} ${Math.abs(value)} ${t('places')}`}>{improved?<ArrowUp size={14}/>:<ArrowDown size={14}/>} {Math.abs(value)}</span>;}
function ChangeValue({value,status,t}:{value:number|null;status:CompareRow['historyStatus'];t:(value:string)=>string}){if(value===null)return <MissingChip row={{historyStatus:status} as CompareRow} t={t}/>;return <span className={`mh-percent ${value>=0?'up':'down'}`}>{value>=0?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>} {formatPercent(value)}</span>;}
function formatCap(value:number){if(!Number.isFinite(value)||value<=0)return '—';const units:[number,string][]=[[1e12,'T'],[1e9,'B'],[1e6,'M']];const [scale,suffix]=units.find(([threshold])=>value>=threshold)||[1,''];return `$${(value/scale).toLocaleString(undefined,{maximumFractionDigits:2})}${suffix}`;}
function formatPercent(value:number|null){return value===null?'—':`${value>=0?'+':''}${value.toFixed(2)}%`;}
