import {AppError,normalizeTicker} from './quotes.mjs';

const weekCache=new Map();
const dayCache=new Map();
const inFlight=new Map();
const NY='America/New_York';
const FRESH_MS=15*60*1000;
/** Keep yesterday’s snapshot long enough that today’s homepage does not wait on Nasdaq. */
const STALE_MS=36*60*60*1000;
const TRILLION=1_000_000_000_000;

export function toYahooSymbol(value){
  const raw=String(value||'').trim().toUpperCase();
  const mapped=/^[A-Z]{1,5}\.[A-Z]{1,2}$/.test(raw)?raw.replace('.','-'):raw;
  try{return normalizeTicker(mapped);}catch{return '';}
}

export function parseMarketCap(value){
  const n=Number(String(value||'').replace(/[^0-9.]/g,''));
  return Number.isFinite(n)?n:0;
}

const MIN_MARKET_CAP=2_000_000_000;

/** Future report dates are fetched the day before and held at the edge; today stays shorter so reported flags can move. */
export function nasdaqCacheTtl(date,today){
  return String(date)>String(today)?86400:900;
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
  return Array.from({length:5},(_,i)=>{
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

/** Nasdaq publishes time-pre-market, time-after-hours and time-not-supplied. Never guess a missing slot. */
export function reportTiming(value){
  const key=String(value||'').toLowerCase();
  if(key.includes('pre-market')||key.includes('bmo')||key.includes('before'))return 'bmo';
  if(key.includes('after-hours')||key.includes('amc')||key.includes('after'))return 'amc';
  if(key.includes('during')||key.includes('market-hours'))return 'during';
  return 'unknown';
}

const hasNumber=value=>/\d/.test(String(value??''));

export function normalizeDayRows(rows){
  const seen=new Set();
  const companies=[];
  for(const row of rows||[]){
    const symbol=toYahooSymbol(row.symbol);
    if(!symbol||seen.has(symbol))continue;
    seen.add(symbol);
    companies.push({
      symbol,
      name:String(row.name||symbol),
      marketCap:parseMarketCap(row.marketCap),
      when:reportTiming(row.time),
      // Nasdaq fills eps only once a quarter is actually published.
      reported:hasNumber(row.eps),
      eps:String(row.eps||'').trim(),
      epsForecast:String(row.epsForecast||'').trim(),
    });
  }
  return companies
    .filter(row=>row.marketCap>=MIN_MARKET_CAP)
    .sort((a,b)=>b.marketCap-a.marketCap);
}

async function nasdaqDay(date,{fetchImpl=fetch}={}){
  const saved=dayCache.get(date);
  if(saved&&Date.now()-saved.at<FRESH_MS)return saved.companies;
  let last=null;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetchImpl('https://api.nasdaq.com/api/calendar/earnings?date='+encodeURIComponent(date),{
        headers:{
          Accept:'application/json, text/javascript, */*; q=0.01',
          'Accept-Language':'en-US,en;q=0.9',
          Origin:'https://www.nasdaq.com',
          Referer:'https://www.nasdaq.com/market-activity/earnings',
          'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
        // Tomorrow’s list is cached 24h so a call made today still answers tomorrow.
        cf:{cacheTtl:nasdaqCacheTtl(date,ymdInZone(new Date())),cacheEverything:true},
        signal:AbortSignal.timeout(7000),
      });
      if(!response.ok)throw new AppError('US earnings calendar is temporarily unavailable.',502);
      const body=await response.json();
      const companies=normalizeDayRows(body?.data?.rows||[]);
      dayCache.set(date,{at:Date.now(),companies});
      if(dayCache.size>80)dayCache.delete(dayCache.keys().next().value);
      return companies;
    }catch(e){
      last=e;
      if(attempt===0)await new Promise(resolve=>setTimeout(resolve,300));
    }
  }
  if(saved)return saved.companies;
  throw last||new AppError('US earnings calendar is temporarily unavailable.',502);
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

async function loadWeek(monday,loadDay,now){
  const loaded=await mapLimit(weekDays(monday),5,async date=>{
    try{return {date,companies:await loadDay(date),ok:true};}
    catch{return {date,companies:[],ok:false};}
  });
  if(loaded.every(row=>!row.ok))throw new AppError('US earnings calendar is temporarily unavailable.',502);
  const {minWeek,maxWeek,todayMonday}=earningsWindow(now);
  return {
    weekStart:monday,
    weekEnd:loaded[loaded.length-1].date,
    days:loaded.map(({date,companies,ok})=>({date,status:ok?'ok':'unavailable',companies})),
    minWeek,maxWeek,todayMonday,
    source:'Nasdaq',
    timezone:NY,
    fetchedAt:new Date().toISOString(),
  };
}

function refreshWeek(monday,loadDay,now){
  const running=inFlight.get(monday);
  if(running)return running;
  const task=loadWeek(monday,loadDay,now).then(data=>{
    weekCache.set(monday,{at:Date.now(),data});
    if(weekCache.size>40)weekCache.delete(weekCache.keys().next().value);
    return data;
  }).finally(()=>inFlight.delete(monday));
  inFlight.set(monday,task);
  return task;
}

/** Later Mondays to warm after the visible week is already answered. */
export function weeksAhead(monday,count,maxWeek){
  const out=[];
  for(let i=1;i<=count;i++){
    const next=addDays(monday,i*7);
    if(next>maxWeek)break;
    out.push(next);
  }
  return out;
}

function prefetchCount(monday,todayMonday){
  if(monday===todayMonday)return 4;
  if(monday>todayMonday)return 3;
  return 2;
}

export async function prefetchAhead(monday,{loadDay=nasdaqDay,now=new Date(),count}={}){
  const current=inFlight.get(monday);
  if(current)await current.catch(()=>{});
  const {maxWeek,todayMonday}=earningsWindow(now);
  const ahead=count??prefetchCount(monday,todayMonday);
  for(const week of weeksAhead(monday,ahead,maxWeek)){
    const saved=weekCache.get(week);
    if(saved&&Date.now()-saved.at<FRESH_MS)continue;
    try{await refreshWeek(week,loadDay,now);}catch{/* Visible week already returned; skip a failed future day. */}
  }
}

export async function earningsWeek(week,{loadDay=nasdaqDay,now=new Date()}={}){
  const monday=clampMonday(week,now);
  if(loadDay!==nasdaqDay)return loadWeek(monday,loadDay,now);
  const saved=weekCache.get(monday);
  const age=saved?Date.now()-saved.at:Infinity;
  const data=age<FRESH_MS?saved.data:age<STALE_MS?(void refreshWeek(monday,loadDay,now).catch(()=>{}),saved.data):await refreshWeek(monday,loadDay,now);
  // Future weeks warm after this response is ready, so this week never waits on them.
  const delay=setTimeout(()=>{void prefetchAhead(monday,{now}).catch(()=>{});},400);
  delay.unref?.();
  return data;
}

function peekCachedWeek(monday){
  const saved=weekCache.get(monday);
  if(saved&&Date.now()-saved.at<STALE_MS)return saved.data;
  return null;
}

async function readWeek(monday,loadDay,now){
  if(loadDay!==nasdaqDay)return loadWeek(monday,loadDay,now);
  const saved=weekCache.get(monday);
  const age=saved?Date.now()-saved.at:Infinity;
  if(age<FRESH_MS)return saved.data;
  if(age<STALE_MS){
    void refreshWeek(monday,loadDay,now).catch(()=>{});
    return saved.data;
  }
  return refreshWeek(monday,loadDay,now);
}

/**
 * Homepage teaser: $1T names reporting this week first, then the largest name on later days.
 * Never takes three names from only the next session.
 */
export function homePreviewRows(days,today,weekStart,{limit=5}={}){
  const upcoming=(days||[]).filter(day=>day.status==='ok'&&day.date>=today)
    .flatMap(day=>(day.companies||[]).filter(row=>!row.reported).map(row=>({
      symbol:row.symbol,
      date:day.date,
      marketCap:Number(row.marketCap)||0,
    })));
  const friday=weekStart?addDays(weekStart,4):'';
  const mega=upcoming
    .filter(row=>row.marketCap>=TRILLION&&(!friday||row.date<=friday))
    .sort((a,b)=>b.marketCap-a.marketCap||a.date.localeCompare(b.date));
  const picked=[];
  const seen=new Set();
  function add(row){
    if(!row||seen.has(row.symbol)||picked.length>=limit)return;
    seen.add(row.symbol);
    picked.push({symbol:row.symbol,date:row.date});
  }
  for(const row of mega)add(row);
  const byDay=new Map();
  for(const row of upcoming){
    if(seen.has(row.symbol))continue;
    const cur=byDay.get(row.date);
    if(!cur||row.marketCap>cur.marketCap)byDay.set(row.date,row);
  }
  for(const date of [...byDay.keys()].sort())add(byDay.get(date));
  const rest=upcoming.filter(row=>!seen.has(row.symbol)).sort((a,b)=>b.marketCap-a.marketCap||a.date.localeCompare(b.date));
  for(const row of rest)add(row);
  return picked;
}

export async function earningsHomePreview({loadDay=nasdaqDay,now=new Date(),limit=5}={}){
  const today=ymdInZone(now);
  const monday=mondayOnOrBefore(today);
  const nextMonday=addDays(monday,7);
  const thisWeek=await readWeek(monday,loadDay,now);
  let nextWeek=loadDay===nasdaqDay?peekCachedWeek(nextMonday):null;
  const friday=thisWeek.weekEnd||addDays(monday,4);
  const laterThisWeek=(thisWeek.days||[]).some(day=>day.status==='ok'&&day.date>today&&(day.companies||[]).some(row=>!row.reported));
  const firstPass=homePreviewRows(thisWeek.days||[],today,monday,{limit});
  if(!nextWeek&&(firstPass.length<limit||!laterThisWeek)){
    try{nextWeek=await readWeek(nextMonday,loadDay,now);}catch{nextWeek=null;}
  }else if(loadDay===nasdaqDay){
    void refreshWeek(nextMonday,loadDay,now).catch(()=>{});
  }
  const rows=homePreviewRows([...(thisWeek.days||[]),...(nextWeek?.days||[])],today,monday,{limit});
  const first=rows[0]?.date||'';
  const label=first===today?'Reporting today':first&&first<=friday?'Reporting this week':'Reporting next week';
  const delay=setTimeout(()=>{void prefetchAhead(monday,{now}).catch(()=>{});},400);
  delay.unref?.();
  return {label,rows,weekStart:monday};
}
