import {AppError,normalizeTicker} from './quotes.mjs';

const cache=new Map();
const dayCache=new Map();
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

export function addDays(iso,n){
  const d=new Date(String(iso).slice(0,10)+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+n);
  return d.toISOString().slice(0,10);
}

const LOOKBACK_WEEKS=26;
const LOOKAHEAD_WEEKS=26;

export function earningsWindow(now=new Date()){
  const todayMonday=mondayOnOrBefore(ymdInZone(now));
  return {
    todayMonday,
    minWeek:addDays(todayMonday,-LOOKBACK_WEEKS*7),
    maxWeek:addDays(todayMonday,LOOKAHEAD_WEEKS*7),
  };
}

export function clampMonday(week,now=new Date()){
  const {minWeek,maxWeek,todayMonday}=earningsWindow(now);
  const monday=mondayOnOrBefore(week||todayMonday);
  if(monday<minWeek)throw new AppError('Past earnings only go back two quarters.',400);
  if(monday>maxWeek)throw new AppError('That week is too far ahead.',400);
  return monday;
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
  const saved=dayCache.get(date);
  if(saved&&Date.now()-saved.at<30*60*1000)return saved.companies;
  const response=await fetchImpl('https://api.nasdaq.com/api/calendar/earnings?date='+encodeURIComponent(date),{
    headers:{
      Accept:'application/json,text/plain,*/*',
      'User-Agent':'Mozilla/5.0 (compatible; StockWatchlist/1.0; +https://stockwatchlist.app)',
    },
    signal:AbortSignal.timeout(8000),
  });
  if(!response.ok)throw new AppError('US earnings calendar is temporarily unavailable.',502);
  const body=await response.json();
  const companies=normalizeDayRows(body?.data?.rows||[]);
  dayCache.set(date,{at:Date.now(),companies});
  if(dayCache.size>80)dayCache.delete(dayCache.keys().next().value);
  return companies;
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

export async function earningsWeek(week,{loadDay=nasdaqDay,now=new Date()}={}){
  const monday=clampMonday(week,now);
  const {minWeek,maxWeek,todayMonday}=earningsWindow(now);
  const saved=cache.get(monday);
  if(saved&&Date.now()-saved.at<30*60*1000)return saved.data;
  const days=await mapLimit(weekDays(monday),7,async date=>{
    try{return {date,companies:await loadDay(date)};}
    catch{return {date,companies:[]};}
  });
  const data={weekStart:monday,weeks:[{weekStart:monday,days}],minWeek,maxWeek,todayMonday,source:'Nasdaq',fetchedAt:new Date().toISOString()};
  cache.set(monday,{at:Date.now(),data});
  if(cache.size>40)cache.delete(cache.keys().next().value);
  return data;
}
