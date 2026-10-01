import YahooFinance from 'yahoo-finance2';
import {normalizeTicker,AppError} from './quotes.mjs';
import {earningsDay} from '../lib/watchlist-earnings.mjs';
import {withTimeout} from '../lib/request-timeout.mjs';
import {todayInMarket} from '../lib/next-earnings.mjs';
const yahoo=new YahooFinance({suppressNotices:['yahooSurvey'],logger:{debug(){},info(){},warn(){},error(){},dir(){},log(){}}});
const cache=new Map();
async function load(symbol){
  return yahoo.quoteSummary(symbol,{modules:['calendarEvents']},{fetchOptions:{signal:AbortSignal.timeout(6000)}});
}
export function earningsSymbols(value){
  const symbols=[...new Set(String(value||'').split(',').filter(Boolean).map(normalizeTicker))];
  if(!symbols.length||symbols.length>20)throw new AppError('Choose between 1 and 20 stocks.');
  return symbols;
}
export async function watchlistEarnings(symbols,{provider=load,now=new Date(),store=cache,timeout=8000}={}){
  const today=todayInMarket(now);
  // Each symbol resolves independently; missing dates are not provider errors.
  const rows=await Promise.all(symbols.map(async symbol=>{
    const prior=store.get(symbol);
    if(prior&&+now-prior.at<300000)return prior.row;
    try{
      const data=await withTimeout(()=>provider(symbol),timeout);
      const dates=data?.calendarEvents?.earnings?.earningsDate||[];
      const date=dates.map(value=>earningsDay(value instanceof Date?value.toISOString():typeof value==='number'?new Date(value*1000).toISOString():value)).filter(day=>day&&day>=today).sort()[0]||null;
      const row={symbol,date,status:date?'available':'unknown'};
      store.set(symbol,{at:+now,row});if(store.size>300)store.delete(store.keys().next().value);
      return row;
    }catch(error){
      if(String(error?.message||'').startsWith('No fundamentals data found for symbol:')){const row={symbol,date:null,status:'unknown'};store.set(symbol,{at:+now,row});return row;}
      if(prior?.row.date>=today&&+now-prior.at<86400000)return {...prior.row,status:'stale'};
      return {symbol,date:null,status:'unavailable'};
    }
  }));
  return {rows,fetchedAt:now.toISOString()};
}
