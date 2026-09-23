'use client';
import {T,useT} from '@/components/product/language';
import {WatchlistAllocation} from '@/components/product/watchlist-allocation';
import {type Watchlist,price,watchlistPerformance} from '@/lib/watchlist';

function totals(list:Watchlist){
 const stocks=list.stocks;
 const dates=stocks.map(s=>Date.parse(s.addedAt)).filter(Number.isFinite);
 const first=dates.length?new Date(Math.min(...dates)):null;
 const currency=stocks[0]?.currency||'USD';
 const supported=stocks.length===0||stocks.every(s=>s.currency===currency);
 const holdings=stocks.filter(s=>s.quantity!==null&&s.quantity>0&&s.costPerShare!==null&&s.costPerShare>0&&Number.isFinite(s.currentPrice));
 const complete=supported&&(stocks.length===0||holdings.length===stocks.length);
 const cost=holdings.reduce((n,s)=>n+s.quantity!*s.costPerShare!,0);
 const value=holdings.reduce((n,s)=>n+s.quantity!*s.currentPrice,0);
 const gain=value-cost;
 const percent=cost>0?gain/cost*100:watchlistPerformance(list);
 return {stocks,first,currency,supported,complete,cost,value,gain,percent};
}

export function WatchlistSummary({list}:{list:Watchlist}){
 const t=useT();
 const {stocks,first,currency,supported,complete,cost,value,gain,percent}=totals(list);
 return <section className="watchlist-summary" aria-label="Watchlist summary"><dl><div><dt><T text="First stock added"/></dt><dd>{first?first.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):t("No stocks yet")}</dd></div><div><dt><T text="Total cost"/></dt><dd>{complete?price(cost,currency):'—'}</dd></div><div><dt><T text="Current value"/></dt><dd>{complete?price(value,currency):'—'}</dd></div><div><dt><T text="Change in value"/></dt><dd className={complete?(gain<0?'down':gain>0?'up':''):''}>{complete?<>{gain>0?'+':''}{price(gain,currency)} <small>{percent===null?'—':`${percent>0?'+':''}${percent.toFixed(2)}%`}</small></>:'—'}</dd></div></dl>{!complete&&<p>{supported?t("Add missing purchase quantities to see complete totals."):t("This list mixed currencies. Keep one currency per list.")}</p>}{stocks.some(s=>s.quoteError)&&<p>Uses last available quotes; some prices could not refresh.</p>}</section>;
}

export function WatchlistBoard({list}:{list:Watchlist}){
 const t=useT();
 const {stocks,first,currency,supported,complete,cost,value,gain,percent}=totals(list);
 const tone=percent===null?'':percent>=0?'up':'down';
 return <section className="watchlist-board" aria-label={t('Watchlist summary')}>
  <div className="watchlist-board-main">
   <div className="watchlist-board-hero">
    <span><T text="Current value"/></span>
    <strong>{complete&&stocks.length?price(value,currency):stocks.length?t('Add shares to see value'):t('No stocks yet')}</strong>
    <em className={tone}>{percent===null?'—':complete?<>{gain>0?'+':''}{price(gain,currency)} <small>({`${percent>0?'+':''}${percent.toFixed(2)}%`})</small></>:`${percent>=0?'+':''}${percent.toFixed(2)}%`} <small>{t('Since created')}</small></em>
   </div>
   <dl>
    <div><dt><T text="First stock added"/></dt><dd>{first?first.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—'}</dd></div>
    <div><dt><T text="Total cost"/></dt><dd>{complete?price(cost,currency):'—'}</dd></div>
    <div><dt><T text="Stocks"/></dt><dd>{stocks.length}</dd></div>
   </dl>
   {!complete&&<p>{supported?t("Add missing purchase quantities to see complete totals."):t("This list mixed currencies. Keep one currency per list.")}</p>}
  </div>
  <WatchlistAllocation list={list} compact/>
 </section>;
}
