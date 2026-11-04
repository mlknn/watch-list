'use client';
import {useT} from '@/components/product/language';
import {useEffect,useState} from 'react';
import {ArrowDownRight,ArrowRight,ArrowUpRight,CalendarClock,ChartNoAxesCombined} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {type AccountState,price} from '@/lib/watchlist';
import {publicDataJson} from '@/lib/request-timeout.mjs';
import {todayInMarket} from '@/lib/next-earnings.mjs';

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

function useEtfs(enabled=true){
  const [state,setState]=useState<LoadState<EtfRow>>({status:'loading',rows:[]});
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    let alive=true;
    void fetch('/api/market?group=us-etfs').then(async r=>{
      const result=await r.json() as {group?:{stocks:EtfRow[]};error?:string};
      if(!r.ok)throw Error(result.error||'unavailable');
      const rows=(result.group?.stocks||[]).filter(row=>row.chart).slice(0,5);
      if(alive)setState({status:'ready',rows});
    }).catch(()=>{if(alive)setState(current=>current.rows.length?{...current,status:'ready'}:{status:'error',rows:[]});});
    return()=>{alive=false;};
  },[attempt,enabled]);
  return {...state,retry:()=>setAttempt(n=>n+1)};
}

function useEarnings(enabled=true){
  const [state,setState]=useState<LoadState<EarningsRow>>({status:'loading',rows:[]});
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    let alive=true;
    void fetch('/api/earnings-preview').then(async r=>{
      const data=await r.json() as {label?:string;rows?:EarningsRow[];error?:string};
      if(!r.ok)throw Error(data.error||'unavailable');
      if(alive)setState({status:'ready',rows:data.rows||[],label:data.label||'Upcoming earnings'});
    }).catch(()=>{if(alive)setState(current=>current.rows.length?{...current,status:'ready'}:{status:'error',rows:[]});});
    return()=>{alive=false;};
  },[attempt,enabled]);
  return {...state,retry:()=>setAttempt(n=>n+1)};
}

type FollowedEarning={symbol:string;date:string|null;status:string};
function useFollowedEarnings(symbols:string,enabled:boolean){
  const [state,setState]=useState<{key:string;rows:FollowedEarning[];status:'loading'|'ready'|'error'}>({key:'',rows:[],status:'loading'});
  useEffect(()=>{
    if(!enabled)return;
    if(!symbols){setState({key:'',rows:[],status:'ready'});return;}
    const controller=new AbortController();
    setState(current=>({key:symbols,rows:current.rows,status:'loading'}));
    void (async()=>{
      const all:FollowedEarning[]=[];
      const values=symbols.split(',');
      for(let start=0;start<values.length;start+=20){
        const data=await publicDataJson('/api/watchlist-earnings?symbols='+encodeURIComponent(values.slice(start,start+20).join(',')),{signal:controller.signal}) as {rows:FollowedEarning[]};
        all.push(...(data.rows||[]));
      }
      if(!controller.signal.aborted)setState({key:symbols,rows:all,status:'ready'});
    })().catch(()=>{if(!controller.signal.aborted)setState(current=>({key:symbols,rows:current.rows,status:'error'}));});
    return()=>controller.abort();
  },[symbols,enabled]);
  return state.key===symbols?state:{key:symbols,rows:[],status:enabled?'loading':'ready'} as const;
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

export function HomeDiscovery({account}:{account?:AccountState|null}={}){
  const t=useT();
  const member=!!account&&!account.guest;
  const etfs=useEtfs(!member);
  const earnings=useEarnings(!member);
  const followed=account?.watchlists.flatMap(list=>list.stocks.map(stock=>({stock,list:list.name})))||[];
  const followedBySymbol=new Map<string,(typeof followed)[number]>();
  for(const item of followed)if(!followedBySymbol.has(item.stock.symbol))followedBySymbol.set(item.stock.symbol,item);
  const followedStocks=[...followedBySymbol.values()];
  const earningSymbols=followedStocks.map(item=>item.stock.symbol).sort().join(',');
  const personalEarnings=useFollowedEarnings(earningSymbols,member);
  const session=(when?:string)=>when==='bmo'?t('Before open'):when==='amc'?t('After close'):when==='during'?t('During market hours'):'';
  if(member){
    const stocks=followedStocks.map(item=>item.stock);
    const changes=stocks.map(stock=>stock.dayChangePercent).filter((value):value is number=>typeof value==='number'&&Number.isFinite(value));
    const average=changes.length?changes.reduce((sum,value)=>sum+value,0)/changes.length:null;
    const up=changes.filter(value=>value>0).length,down=changes.filter(value=>value<0).length;
    const movers=[...followedStocks].sort((a,b)=>Math.abs(b.stock.dayChangePercent||0)-Math.abs(a.stock.dayChangePercent||0)).slice(0,5);
    const upcoming=personalEarnings.rows.filter(row=>row.date&&row.date>=todayInMarket()).sort((a,b)=>a.date!.localeCompare(b.date!)).slice(0,5);
    const companyFor=(symbol:string)=>followedBySymbol.get(symbol)?.stock.companyName||symbol;
    const daysUntil=(date:string)=>Math.max(0,Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(todayInMarket()+'T12:00:00Z'))/86_400_000));
    return <section className="home-discover home-discover-member" aria-label={t('Your market and earnings')}>
      <Panel title={t('Your market pulse')} scope={t('Today across your watchlists')} action={t('Explore markets')} href="/dashboard">
        <div className="member-pulse-summary">
          <div className="member-pulse-average"><span><ChartNoAxesCombined size={16}/>{t('Average daily move')}</span><strong className={average===null?'':average>0?'up':average<0?'down':''}>{pct(average)}</strong></div>
          <div className="member-pulse-balance"><span className="up">{up} {t('up')}</span><i aria-hidden="true"/><span className="down">{down} {t('down')}</span><small>{stocks.length} {t('stocks followed')}</small></div>
        </div>
        {movers.length?<ul className="member-movers">{movers.map(({stock,list})=>{
          const change=stock.dayChangePercent;
          const tone=change===undefined||change===null?'flat':change>0?'up':change<0?'down':'flat';
          const Icon=change!==undefined&&change!==null&&change<0?ArrowDownRight:ArrowUpRight;
          return <li key={stock.id}><CompanyIcon symbol={stock.symbol}/><span><strong>{stock.symbol}</strong><small>{list}</small></span><span className={'member-mover-change '+tone}>{change===undefined||change===null?'—':pct(change)}<Icon size={14}/></span></li>;
        })}</ul>:<p className="home-panel-status">{t('Add stocks to your watchlists to see your personal market pulse.')}</p>}
      </Panel>
      <Panel title={t('Earnings on your radar')} scope={t('Upcoming reports from companies you follow')} action={t('View earnings calendar')} href="/earnings?watch=1">
        {personalEarnings.status==='loading'?<div className="home-panel-skel" role="status" aria-label={t('Loading your earnings…')}><i/><i/><i/></div>
          :personalEarnings.status==='error'?<p className="home-panel-status" role="alert">{t('Followed-stock earnings are temporarily unavailable.')}</p>
          :upcoming.length?<ul className="member-followed-earnings">{upcoming.map(row=>{const days=daysUntil(row.date!);return <li key={row.symbol+row.date}><CompanyIcon symbol={row.symbol}/><span><strong>{row.symbol}</strong><small>{companyFor(row.symbol)}</small></span><span className="member-earnings-date"><time dateTime={row.date!}>{shortDate(row.date!)}</time><small>{days===0?t('Today'):days===1?t('Tomorrow'):`${days} ${t('days away')}`}</small></span></li>;})}</ul>
          :<div className="member-no-earnings"><CalendarClock size={18}/><span>{t('No upcoming report dates for your followed stocks yet.')}</span></div>}
      </Panel>
    </section>;
  }
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
  </section>;
}
