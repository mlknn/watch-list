'use client';
import {useT} from '@/components/product/language';
import {useEffect,useState} from 'react';
import {ArrowRight,LoaderCircle} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {price} from '@/lib/watchlist';

type EtfRow={symbol:string;chart:{companyName:string;currency:string;quote:{price:number;changePercent:number|null}}|null};
type EarningsRow={symbol:string;date:string;when?:string};
type HistoryRow={rank:number;symbol:string;name:string;marketCap:number;price:number|null;currency:string;changePercent:number|null;historyAvailable:boolean};
type HistoryPage={range:string;offset:number;nextOffset:number|null;total:number;asOf:string;startDate:string;rows:HistoryRow[]};
type HistoryData=HistoryPage;
type LoadState<T>={status:'loading'|'ready'|'error';rows:T[];label?:string};

const pct=(value:number|null|undefined)=>value===null||value===undefined?'—':`${value>=0?'+':''}${value.toFixed(2)}%`;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const shortDate=(iso:string)=>{
  const date=new Date(iso+'T12:00:00Z');
  if(!Number.isFinite(date.getTime()))return iso;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
};

function useEtfs(){
  const [state,setState]=useState<LoadState<EtfRow>>({status:'loading',rows:[]});
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let alive=true;
    void fetch('/api/market?group=us-etfs').then(async r=>{
      const result=await r.json() as {group?:{stocks:EtfRow[]};error?:string};
      if(!r.ok)throw Error(result.error||'unavailable');
      const rows=(result.group?.stocks||[]).filter(row=>row.chart).slice(0,5);
      if(alive)setState({status:'ready',rows});
    }).catch(()=>{if(alive)setState(current=>current.rows.length?{...current,status:'ready'}:{status:'error',rows:[]});});
    return()=>{alive=false;};
  },[attempt]);
  return {...state,retry:()=>setAttempt(n=>n+1)};
}

function useEarnings(){
  const [state,setState]=useState<LoadState<EarningsRow>>({status:'loading',rows:[]});
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let alive=true;
    void fetch('/api/earnings-preview').then(async r=>{
      const data=await r.json() as {label?:string;rows?:EarningsRow[];error?:string};
      if(!r.ok)throw Error(data.error||'unavailable');
      if(alive)setState({status:'ready',rows:data.rows||[],label:data.label||'Upcoming earnings'});
    }).catch(()=>{if(alive)setState(current=>current.rows.length?{...current,status:'ready'}:{status:'error',rows:[]});});
    return()=>{alive=false;};
  },[attempt]);
  return {...state,retry:()=>setAttempt(n=>n+1)};
}

function useMarketHistory(range:string,enabled:boolean){
  const [data,setData]=useState<HistoryData|null>(null),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0);
  useEffect(()=>{if(!enabled)return;let alive=true;setData(null);setStatus('loading');void(async()=>{try{let offset:number|null=0,combined:HistoryData|null=null;while(offset!==null){const response=await fetch(`/api/market-history?range=${range}&offset=${offset}`);const result=await response.json() as HistoryPage&{error?:string};if(!response.ok)throw Error(result.error||'Market history is temporarily unavailable.');combined=combined?{...result,rows:[...combined.rows,...result.rows]}:result;if(alive){setData(combined);setStatus('loading');}offset=result.nextOffset;}if(alive)setStatus('ready');}catch{if(alive)setStatus('error');}})();return()=>{alive=false;};},[range,attempt,enabled]);
  return {data,status,retry:()=>setAttempt(value=>value+1)};
}

function Panel({title,scope,action,href,children}:{title:string;scope:string;action:string;href:string;children:React.ReactNode}){
  return <article className="home-panel">
    <header>
      <div>
        <h2>{title}</h2>
        <p>{scope}</p>
      </div>
      <a href={href}>{action}<ArrowRight size={16} aria-hidden="true"/></a>
    </header>
    {children}
  </article>;
}

export function HomeDiscovery(){
  const t=useT();
  const etfs=useEtfs();
  const earnings=useEarnings();
  const [tab,setTab]=useState<'markets'|'earnings'|'history'>('markets');
  const [range,setRange]=useState('ytd');
  const history=useMarketHistory(range,tab==='history');
  useEffect(()=>{const selectHash=()=>{if(window.location.hash==='#history')setTab('history');};selectHash();window.addEventListener('hashchange',selectHash);return()=>window.removeEventListener('hashchange',selectHash);},[]);
  const session=(when?:string)=>when==='bmo'?t('Before open'):when==='amc'?t('After close'):when==='during'?t('During market hours'):'';
  return <section className="home-discover" aria-label={t('Markets and earnings')}>
    <nav className="home-discover-tabs" aria-label={t('Market information')}>
      {([['markets',t('Markets')],['earnings',t('Earnings')],['history',t('History')]] as const).map(([id,label])=><button type="button" id={id==='history'?'history':undefined} key={id} aria-pressed={tab===id} className={tab===id?'is-active':''} onClick={()=>setTab(id)}>{label}</button>)}
    </nav>
    {tab==='history'?<section className="home-history" aria-label={t('Market history')}>
      <div className="home-history-main">
        <header className="home-history-heading"><div><p className="eyebrow">{t('THE LARGEST PUBLIC COMPANIES')}</p><h2>{t('Top 100 by market cap')}</h2><p>{t('Ranked by current market value. Returns compare adjusted share prices.')}</p></div><span>{history.data?.asOf?`${t('As of')} ${new Date(history.data.asOf).toLocaleDateString()}`:''}</span></header>
        {history.status==='loading'&&!history.data?<div className="home-history-loading" role="status"><LoaderCircle className="spin"/>{t('Loading market history…')}</div>:history.status==='error'&&!history.data?<p className="home-panel-status" role="alert">{t('Market history is temporarily unavailable.')}<button type="button" className="home-inline-retry" onClick={history.retry}>{t('Retry')}</button></p>:<div className="home-history-scroll" role="region" aria-label={t('Top 100 companies by market capitalization')} tabIndex={0}><table className="home-history-table"><caption className="sr-only">{t('Top 100 by market cap')}</caption><thead><tr><th scope="col">#</th><th scope="col">{t('Company')}</th><th scope="col">{t('Market cap')}</th><th scope="col">{t('Price now')}</th><th scope="col">{t('Change')}</th></tr></thead><tbody>{history.data?.rows.map(row=><tr key={row.symbol}><td>{row.rank}</td><th scope="row"><a href={'/stocks/'+encodeURIComponent(row.symbol)}><CompanyIcon symbol={row.symbol}/><span><strong>{row.symbol}</strong><small>{row.name}</small></span></a></th><td>{formatMarketCap(row.marketCap)}</td><td>{row.price===null?'—':price(row.price,row.currency)}</td><td className={row.changePercent===null?'':row.changePercent>=0?'up':'down'}>{row.changePercent===null?'—':pct(row.changePercent)}</td></tr>)}</tbody></table></div>}
        {history.status==='error'&&history.data&&<p className="home-panel-status" role="alert">{t('Some market history is unavailable.')}<button type="button" className="home-inline-retry" onClick={history.retry}>{t('Retry')}</button></p>}
        {history.status==='loading'&&history.data&&history.data.rows.length<100&&<p className="home-history-refresh" role="status"><LoaderCircle className="spin" size={14}/>{t('Loading the rest of the top 100…')}</p>}
        <p className="home-history-source">{t('Source: Yahoo Finance. Market caps and quotes may be delayed. Historical returns use split-adjusted prices and exclude dividends; missing history is shown as unavailable.')}</p>
      </div>
      <aside className="home-history-controls"><p className="eyebrow">{t('COMPARE FROM')}</p><h3>{t('Choose a starting point')}</h3><p>{t('See how today’s largest companies have changed since a selected date.')}</p><label htmlFor="market-history-range">{t('Period')}</label><select id="market-history-range" value={range} onChange={event=>setRange(event.target.value)}><option value="ytd">{t('Beginning of this year')}</option><option value="1y">{t('1 year ago')}</option><option value="2y">{t('2 years ago')}</option><option value="5y">{t('5 years ago')}</option><option value="10y">{t('10 years ago')}</option></select>{history.data&&<div className="home-history-selected"><span>{t('Starting date')}</span><strong>{new Date(history.data.startDate+'T12:00:00Z').toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}</strong><span>{t('Companies ranked by current market cap')}</span></div>}{history.status==='loading'&&<small className="home-history-refresh" role="status"><LoaderCircle className="spin" size={14}/>{t('Updating selected period…')}</small>}</aside>
    </section>:<div className="home-discover-panels">
    <Panel title={t('Markets at a glance')} scope={t('US ETFs')} action={t('Explore markets')} href="/dashboard">
      {etfs.status==='loading'&&!etfs.rows.length?<div className="home-panel-skel" role="status" aria-label={t('Loading quotes…')}><i/><i/><i/><i/></div>
        :etfs.status==='error'?<p className="home-panel-status" role="alert">{t('Market data is temporarily unavailable.')}<button type="button" className="home-inline-retry" onClick={etfs.retry}>{t('Retry')}</button></p>
        :etfs.rows.length?<table>
          <caption className="sr-only">{t('US ETFs')}</caption>
          <thead><tr><th>{t('Company')}</th><th>{t('Price')}</th><th>{t('Daily change')}</th></tr></thead>
          <tbody>{etfs.rows.map(row=>{
            const change=row.chart!.quote.changePercent;
            return <tr key={row.symbol}>
              <th scope="row"><CompanyIcon symbol={row.symbol}/><span><strong>{row.symbol}</strong><small>{row.chart!.companyName}</small></span></th>
              <td>{price(row.chart!.quote.price,row.chart!.currency)}</td>
              <td className={change===null||change===undefined?'':change>=0?'up':'down'}>{pct(change)}{change!==null&&change!==undefined?<span className="sr-only">{change>=0?t('Up on the day'):t('Down on the day')}</span>:null}</td>
            </tr>;
          })}</tbody>
        </table>:<p className="home-panel-status">{t('Market data is temporarily unavailable.')}</p>}
    </Panel>
    <Panel title={t('Upcoming earnings')} scope={t(earnings.label&&earnings.label!=='Upcoming earnings'?earnings.label:'US-listed companies of all sizes')} action={t('View earnings calendar')} href="/earnings">
      {earnings.status==='loading'&&!earnings.rows.length?<div className="home-panel-skel" role="status" aria-label={t('Loading the calendar…')}><i/><i/><i/><i/></div>
        :earnings.status==='error'?<p className="home-panel-status" role="alert">{t('Earnings data is temporarily unavailable.')}<button type="button" className="home-inline-retry" onClick={earnings.retry}>{t('Retry')}</button></p>
        :earnings.rows.length?<ul>{earnings.rows.slice(0,5).map(row=>{
          const timing=session(row.when);
          return <li key={row.symbol+row.date}>
            <CompanyIcon symbol={row.symbol}/>
            <span><strong>{row.symbol}</strong>{timing?<small>{timing}</small>:null}</span>
            <time dateTime={row.date}>{shortDate(row.date)}</time>
          </li>;
        })}</ul>:<p className="home-panel-status">{t('No upcoming announcements in the available coverage.')}</p>}
    </Panel>
    </div>}
  </section>;
}

function formatMarketCap(value:number){
  if(!Number.isFinite(value)||value<=0)return '—';
  const units:[number,string][]=[[1e12,'T'],[1e9,'B'],[1e6,'M']];
  const [scale,suffix]=units.find(([threshold])=>value>=threshold)||[1,''];
  return `$${(value/scale).toLocaleString(undefined,{maximumFractionDigits:2})}${suffix}`;
}
