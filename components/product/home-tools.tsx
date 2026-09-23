'use client';
import {useT} from '@/components/product/language';
import {useEffect,useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {price} from '@/lib/watchlist';

type EtfRow={symbol:string;chart:{companyName:string;currency:string;quote:{price:number;changePercent:number|null}}|null};
type EarningsRow={symbol:string;date:string;when?:string};
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
  const session=(when?:string)=>when==='bmo'?t('Before open'):when==='amc'?t('After close'):when==='during'?t('During market hours'):'';
  return <section className="home-discover" aria-label={t('Markets and earnings')}>
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
    <Panel title={t('Upcoming earnings')} scope={t(earnings.label&&earnings.label!=='Upcoming earnings'?earnings.label:'US-listed companies above $1B')} action={t('View earnings calendar')} href="/earnings">
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
  </section>;
}
