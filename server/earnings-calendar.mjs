import {AppError,normalizeTicker} from './quotes.mjs';

const cache=new Map();
const NY='America/New_York';

export function toYahooSymbol(value){
  const raw=String(value||'').trim().toUpperCase();
  const mapped=/^[A-Z]{1,5}\.[A-Z]{1,2}$/.test(raw)?raw.replace('.','-'):raw;
  try{return normalizeTicker(mapped);}catch{return '';}
}

export function parseMarketCap(value){
  const n=Number(String(value||'').replace(/[^0-9.]/g,''));
  return Number.isFinite(n)?n:0;
}

export function ymdInZone(date,tz=NY){
  return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}

export function mondayOnOrBefore(iso,tz=NY){
  const day=String(iso||ymdInZone(new Date(),tz)).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new AppError('Use a week date such as 2026-09-14.',400);
  const utc=new Date(day+'T12:00:00Z');
  const back=(utc.getUTCDay()+6)%7;
  utc.setUTCDate(utc.getUTCDate()-back);
  return utc.toISOString().slice(0,10);
}

export function weekDays(monday){
  const start=new Date(monday+'T12:00:00Z');
  return Array.from({length:7},(_,i)=>{
    const d=new Date(start);d.setUTCDate(start.getUTCDate()+i);
    return d.toISOString().slice(0,10);
  });
}

export function normalizeDayRows(rows){
  const seen=new Set();
  const companies=[];
  for(const row of rows||[]){
    const symbol=toYahooSymbol(row.symbol);
    if(!symbol||seen.has(symbol))continue;
    seen.add(symbol);
    const time=String(row.time||'');
    companies.push({
      symbol,
      name:String(row.name||symbol),
      marketCap:parseMarketCap(row.marketCap),
      when:time.includes('bmo')?'bmo':time.includes('amc')?'amc':'',
    });
  }
  return companies.sort((a,b)=>b.marketCap-a.marketCap);
}

async function nasdaqDay(date,{fetchImpl=fetch}={}){
  const response=await fetchImpl('https://api.nasdaq.com/api/calendar/earnings?date='+encodeURIComponent(date),{
    headers:{
      Accept:'application/json,text/plain,*/*',
      'User-Agent':'Mozilla/5.0 (compatible; StockWatchlist/1.0; +https://stockwatchlist.app)',
    },
    signal:AbortSignal.timeout(12000),
  });
  if(!response.ok)throw new AppError('US earnings calendar is temporarily unavailable.',502);
  const body=await response.json();
  return normalizeDayRows(body?.data?.rows||[]);
}

async function mapLimit(items,limit,fn){
  const out=new Array(items.length);
  let next=0;
  async function worker(){
    while(next<items.length){
      const index=next++;
      out[index]=await fn(items[index],index);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return out;
}

export async function earningsWeek(week,{loadDay=nasdaqDay}={}){
  const monday=mondayOnOrBefore(week);
  const saved=cache.get(monday);
  if(saved&&Date.now()-saved.at<30*60*1000)return saved.data;
  const days=await mapLimit(weekDays(monday),3,async date=>{
    try{return {date,companies:await loadDay(date)};}
    catch{return {date,companies:[]};}
  });
  const data={weekStart:monday,days,source:'Nasdaq',fetchedAt:new Date().toISOString()};
  cache.set(monday,{at:Date.now(),data});
  if(cache.size>24)cache.delete(cache.keys().next().value);
  return data;
}
