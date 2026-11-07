'use client';
import {useLang,useT} from '@/components/product/language';
import {T} from '@/components/product/language';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {CalendarDays,ChevronLeft,ChevronRight,Download,List,LoaderCircle,Search,Star,X} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Sheet,SheetContent,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {HoverCard,HoverCardTrigger,HoverCardContent} from '@/components/ui/hover-card';
import {apiJson,signedIn} from '@/lib/auth-client';
import {readGuestState} from '@/lib/guest-watchlist.mjs';
import {addDays,earningsWeekMonday,todayInMarket} from '@/lib/next-earnings.mjs';
import {weeksToPrefetch} from '@/lib/earnings-week-prefetch.mjs';
import type {AccountState} from '@/lib/watchlist';
import {earningsCsv,epsSurprise,filterEarningsRows,formatCap,formatEps,formatSurprise,sortEarningsRows,weekRangeLabel} from '@/lib/earnings-compare.mjs';
import {stockHref} from '@/lib/safe-return.mjs';
import {price} from '@/lib/watchlist';

type Company={symbol:string;name:string;when:string;reported:boolean;eps:string;epsForecast:string;marketCap?:number};
type Day={date:string;status:string;companies:Company[]};
type Board={weekStart:string;weekEnd:string;days:Day[];minWeek:string;maxWeek:string;todayMonday:string;source:string;timezone:string;fetchedAt:string};
type Row=Company&{date:string;dayStatus:string};
type DayQuote={symbol:string;currency:string;price:number;changePercent:number|null};
type Session='bmo'|'amc'|'during'|'unknown';
type Status='upcoming'|'reported';
type Cap='under-1'|'unknown'|'1-10'|'10-50'|'50-200'|'200+';
type View='calendar'|'table';
type SortKey='symbol'|'date'|'session'|'status'|'estimate'|'actual'|'surprisePct'|'surpriseAbs'|'cap';

function shiftWeek(monday:string,delta:number){
  return addDays(monday,delta*7);
}
const localeOf=(lang:string)=>lang==='tr'?'tr-TR':lang==='es'?'es-ES':'en-US';
const dayFormat=(iso:string,options:Intl.DateTimeFormatOptions,locale='en-US')=>new Date(iso+'T12:00:00Z').toLocaleDateString(locale,{...options,timeZone:'UTC'});
const UNAVAILABLE='The earnings calendar is temporarily unavailable.';
const VIEW_KEY='earnings:view';
const weekStore=new Map<string,Board>();
const weekPending=new Map<string,Promise<Board>>();
const dayQuoteCache=new Map<string,{at:number;quote:DayQuote}>();
let prefetchQueue=Promise.resolve();

function rememberWeek(monday:string,result:Board){
  weekStore.set(result.weekStart,result);
  if(!monday)weekStore.set('',result);
}

function pullWeek(monday:string){
  const key=monday||earningsWeekMonday(todayInMarket())||'';
  const existing=weekPending.get(key)||(!monday?weekPending.get(''):undefined);
  if(existing)return existing;
  const query=monday?'?week='+encodeURIComponent(monday):'';
  const task=fetch('/api/earnings-calendar'+query,{signal:AbortSignal.timeout(10000)}).then(async r=>{
    const result=await r.json() as Board&{error?:string};
    if(!r.ok)throw Error(result.error||UNAVAILABLE);
    rememberWeek(monday,result);
    return result;
  }).finally(()=>{weekPending.delete(key);if(!monday)weekPending.delete('');});
  weekPending.set(key,task);
  if(!monday)weekPending.set('',task);
  return task;
}
function cachedWeek(monday:string){return weekStore.get(monday)||(!monday?weekStore.get(''):undefined);}
function warmAround(monday:string,bounds?:{minWeek?:string;maxWeek?:string}){
  if(!monday)return;
  for(const next of weeksToPrefetch(monday,bounds)){
    prefetchQueue=prefetchQueue.then(async()=>{
      if(weekStore.has(next)||weekPending.has(next))return;
      await pullWeek(next).catch(()=>{/* Visible week stays on screen if a neighbor misses. */});
    });
  }
}

function readView(params:URLSearchParams):View{
  const url=params.get('view');
  if(url==='table'||url==='calendar')return url;
  try{const saved=window.localStorage.getItem(VIEW_KEY);if(saved==='table'||saved==='calendar')return saved;}catch{/* keep calendar */}
  return 'calendar';
}

export function EarningsCalendar(){
  const t=useT();
  const lang=useLang();
  const locale=localeOf(lang);
  const router=useRouter();
  const params=useSearchParams();
  const week=params.get('week')||'';
  const [data,setData]=useState<Board|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [attempt,setAttempt]=useState(0);
  const [query,setQuery]=useState(params.get('q')||'');
  const [watchSymbols,setWatchSymbols]=useState<Set<string>>(new Set());
  const [isMember,setIsMember]=useState(false);
  const [dayQuotes,setDayQuotes]=useState<Record<string,DayQuote|null>>({});
  const [watchError,setWatchError]=useState('');
  const [staleNotice,setStaleNotice]=useState('');
  const [expandedDays,setExpandedDays]=useState<Set<string>>(new Set());
  const [calendarMode,setCalendarMode]=useState<'weekly'|'day'>('weekly');
  const [sort,setSort]=useState<{key:SortKey;dir:'asc'|'desc'}>({key:'cap',dir:'desc'});
  const [mobileFilters,setMobileFilters]=useState(false);
  const mobileFocusDone=useRef(false);
  const [view,setViewState]=useState<View>(()=>{
    const url=params.get('view');
    return url==='calendar'?'calendar':'table';
  });
  const today=useMemo(()=>todayInMarket(),[]);
  const focusDate=useMemo(()=>{const weekday=new Date(today+'T12:00:00Z').getUTCDay();return weekday===6?addDays(today,2):weekday===0?addDays(today,1):today;},[today]);
  const focusWeek=useMemo(()=>earningsWeekMonday(focusDate),[focusDate]);
  const [selectedDay,setSelectedDay]=useState(()=>{
    const current=todayInMarket();
    const weekday=new Date(current+'T12:00:00Z').getUTCDay();
    return weekday===0||weekday===6?earningsWeekMonday(current):current;
  });
  const urlView=params.get('view');
  const session=(params.get('session')||'') as Session|'';
  const status=(params.get('status')||'') as Status|'';
  const cap=(params.get('cap')||'') as Cap|'';
  const watchOnly=params.get('watch')==='1';
  const paramKey=params.toString();

  useEffect(()=>{
    let alive=true;
    void (async()=>{
      try{
        if(await signedIn()){
          setIsMember(true);
          const state=await apiJson<AccountState>('/api/watchlists');
          if(!alive)return;
          const symbols=new Set(state.watchlists.flatMap(list=>list.stocks.map(stock=>stock.symbol)));
          setWatchSymbols(symbols);
          setWatchError('');
          return;
        }
      }catch{
        if(alive)setWatchError(t('Watchlists could not be loaded. The calendar is shown without your list filter.'));
        const guest=readGuestState(window.localStorage);
        if(!alive)return;
        const symbols=new Set(guest.watchlists.flatMap(list=>list.stocks.map(stock=>stock.symbol)));
        setWatchSymbols(symbols);
        return;
      }
      const guest=readGuestState(window.localStorage);
      if(!alive)return;
      setWatchError('');
      const symbols=new Set(guest.watchlists.flatMap(list=>list.stocks.map(stock=>stock.symbol)));
      setWatchSymbols(symbols);
    })();
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    let alive=true;
    const monday=week||focusWeek;
    const hit=cachedWeek(week)||cachedWeek(monday);
    if(hit){setData(hit);setLoading(false);setError('');setStaleNotice('');warmAround(monday,{minWeek:hit.minWeek,maxWeek:hit.maxWeek});}
    else{setData(null);setLoading(true);setError('');setStaleNotice('');}
    if(hit&&!attempt)return()=>{alive=false;};
    void pullWeek(week).then(result=>{
      if(!alive)return;
      setData(result);
      setLoading(false);
      setStaleNotice('');
      warmAround(result.weekStart,{minWeek:result.minWeek,maxWeek:result.maxWeek});
    }).catch(e=>{if(!alive)return;if(hit){setStaleNotice(e.message||UNAVAILABLE);setLoading(false);return;}setError(e.message||UNAVAILABLE);setLoading(false);});
    return()=>{alive=false;};
  },[week,attempt,today,focusWeek]);

  useEffect(()=>{
    if(!isMember||!data||loading||mobileFocusDone.current)return;
    if(!window.matchMedia('(max-width: 680px)').matches)return;
    const target=document.getElementById('earnings-'+focusDate);
    if(!target)return;
    mobileFocusDone.current=true;
    window.requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}));
  },[isMember,data,loading,focusDate]);

  const writeUrl=(patch:Record<string,string|null>,mode:'push'|'replace'='push')=>{
    const next=new URLSearchParams(params.toString());
    for(const [key,value] of Object.entries(patch)){
      if(!value)next.delete(key);
      else next.set(key,value);
    }
    const queryString=next.toString();
    const href=queryString?'/earnings?'+queryString:'/earnings';
    if(mode==='replace')router.replace(href);
    else router.push(href);
  };
  const replace=(patch:Record<string,string|null>)=>writeUrl(patch,'push');

  const go=useCallback((next:string)=>{
    if(!data||next<data.minWeek||next>data.maxWeek)return;
    if(!cachedWeek(next))void pullWeek(next).catch(()=>{});
    replace({week:next===focusWeek?null:next});
  },[data,params,calendarMode,focusWeek]);

  const setView=(next:View)=>{
    setViewState(next);
    try{window.localStorage.setItem(VIEW_KEY,next);}catch{/* View still updates in the URL. */}
    replace({view:next==='calendar'?null:next});
  };

  const moveSelectedDay=(delta:number)=>{
    let candidate=addDays(selectedDay,delta);
    let weekday=new Date(candidate+'T12:00:00Z').getUTCDay();
    if(weekday===0)candidate=addDays(candidate,delta>0?1:-2);
    else if(weekday===6)candidate=addDays(candidate,delta>0?2:-1);
    setSelectedDay(candidate);
    const monday=earningsWeekMonday(candidate);
    if(monday&&monday!==data?.weekStart)go(monday);
  };

  useEffect(()=>{
    if(urlView==='table'||urlView==='calendar')setViewState(urlView);
  },[urlView]);
  useEffect(()=>{
    if(urlView==='table'||urlView==='calendar')return;
    try{
      const saved=window.localStorage.getItem(VIEW_KEY);
      if(saved==='table'||saved==='calendar')setViewState(saved);
    }catch{/* First-time visitors stay on calendar. */}
  },[]);
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      const current=new URLSearchParams(paramKey);
      if(query===(current.get('q')||''))return;
      writeUrl({q:query.trim()||null},'replace');
    },250);
    return()=>window.clearTimeout(timer);
  },[query,paramKey]);

  const timing=(when:string)=>when==='bmo'?t('Before open')
    :when==='amc'?t('After close')
    :when==='during'?t('During market hours')
    :'';

  const rows=useMemo(()=>{
    const all=(data?.days||[]).flatMap(day=>day.companies.map(company=>({...company,date:day.date,dayStatus:day.status})));
    return filterEarningsRows(all,query,session,status,watchOnly,watchSymbols,cap);
  },[data,query,session,status,watchOnly,watchSymbols,cap]);

  const filteredByDay=useMemo(()=>{
    const map=new Map<string,Row[]>();
    for(const row of rows){
      const list=map.get(row.date)||[];
      list.push(row);
      map.set(row.date,list);
    }
    for(const list of map.values())list.sort((a,b)=>{
      const av=Number.isFinite(a.marketCap)?a.marketCap as number:null;
      const bv=Number.isFinite(b.marketCap)?b.marketCap as number:null;
      if(av===null&&bv===null)return a.symbol.localeCompare(b.symbol);
      if(av===null)return 1;
      if(bv===null)return -1;
      return bv-av || a.symbol.localeCompare(b.symbol);
    });
    return map;
  },[rows]);

  const sortedRows=useMemo(()=>sortEarningsRows(rows,sort),[rows,sort]);

  const days=data?.days||[];
  const selectedDayBoard=days.find(day=>day.date===selectedDay);
  const selectedDayRows=filteredByDay.get(selectedDay)||[];
  useEffect(()=>{
    if(calendarMode!=='day'||!selectedDayRows.length)return;
    let alive=true;
    const missing=selectedDayRows.map(row=>row.symbol).filter(symbol=>{const cached=dayQuoteCache.get(symbol);if(cached&&Date.now()-cached.at<30000)return false;dayQuoteCache.delete(symbol);return true;});
    const cached=Object.fromEntries(selectedDayRows.filter(row=>dayQuoteCache.has(row.symbol)).map(row=>[row.symbol,dayQuoteCache.get(row.symbol)!.quote]));
    setDayQuotes(current=>({...current,...cached}));
    void (async()=>{
      if(!missing.length)return;
      try{
        const response=await fetch(`/api/earnings-quotes?symbols=${encodeURIComponent(missing.join(','))}`,{signal:AbortSignal.timeout(60000)});
        if(!response.ok)throw new Error('Quotes unavailable');
        const quotes=await response.json() as DayQuote[];
        const results=Object.fromEntries(missing.map(symbol=>[symbol,quotes.find(quote=>quote.symbol===symbol)||null]));
        for(const [symbol,quote] of Object.entries(results))if(quote)dayQuoteCache.set(symbol,{at:Date.now(),quote});
        if(alive)setDayQuotes(current=>({...current,...results}));
      }catch{
        const results=Object.fromEntries(missing.map(symbol=>[symbol,null]));
        if(alive)setDayQuotes(current=>({...current,...results}));
      }
    })();
    return()=>{alive=false;};
  },[calendarMode,selectedDayRows]);
  const prev=data?shiftWeek(data.weekStart,-1):'';
  const next=data?shiftWeek(data.weekStart,1):'';
  const canPrev=!!data&&prev>=data.minWeek;
  const canNext=!!data&&next<=data.maxWeek;
  const onThisWeek=!!data&&data.weekStart===focusWeek;
  const range=data?weekRangeLabel(data.weekStart,data.weekEnd):'';
  const chips=[
    query?{key:'q',label:`“${query}”`}:null,
    watchOnly?{key:'watch',label:t('My watchlists')}:null,
    session?{key:'session',label:timing(session)}:null,
    status?{key:'status',label:status==='reported'?t('Reported'):t('Upcoming')}:null,
    cap?{key:'cap',label:capLabel(cap,t)}:null,
  ].filter(Boolean) as {key:string;label:string}[];
  const emptyCoverage=!loading&&!!data&&days.every(day=>day.status==='ok'&&!day.companies.length);
  const emptyWatch=!loading&&!!data&&watchOnly&&watchSymbols.size===0;
  const emptyFilters=!loading&&!!data&&!rows.length&&!emptyCoverage&&!emptyWatch;

  function openRow(row:Row){router.push(stockHref(row.symbol,'/earnings'+(paramKey?'?'+paramKey:'')));}
  function exportCsv(){
    const csv=earningsCsv(sortedRows,{timezone:data?.timezone||'America/New_York',source:data?.source||'Nasdaq',fetchedAt:data?.fetchedAt||'',sessionLabel:timing});
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`earnings-${data?.weekStart||'week'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filters=(wide=true)=><div className={wide?'earnings-filter-row':'earnings-filter-sheet'}>
    <label className="earnings-filter">
      <span>{t('Announcement time')}</span>
      <select value={session} onChange={e=>replace({session:e.target.value||null})}>
        <option value="">{t('All times')}</option>
        <option value="bmo">{t('Before open')}</option>
        <option value="amc">{t('After close')}</option>
        <option value="during">{t('During market hours')}</option>
        <option value="unknown">{t('Time not supplied')}</option>
      </select>
    </label>
    <label className="earnings-filter">
      <span>{t('Status')}</span>
      <select value={status} onChange={e=>replace({status:e.target.value||null})}>
        <option value="">{t('All statuses')}</option>
        <option value="upcoming">{t('Upcoming')}</option>
        <option value="reported">{t('Reported')}</option>
      </select>
    </label>
    <label className="earnings-filter">
      <span>{t('Market cap')}</span>
      <select value={cap} onChange={e=>replace({cap:e.target.value||null})}>
        <option value="">{t('All market caps')}</option>
        <option value="under-1">{t('Under $1B')}</option>
        <option value="unknown">{t('Market cap unavailable')}</option>
        <option value="1-10">$1–10B</option>
        <option value="10-50">$10–50B</option>
        <option value="50-200">$50–200B</option>
        <option value="200+">$200B+</option>
      </select>
    </label>
    <label className="earnings-watch-toggle">
      <input type="checkbox" checked={watchOnly} onChange={e=>replace({watch:e.target.checked?'1':null})}/>
      <span>{t('My watchlists')}</span>
    </label>
  </div>;

  return <main className={'earnings-cal-page'+(view==='table'?' is-table-view':'')}>
    <div className="earnings-cal-head"><h1><T text="Earnings calendar"/></h1><div className="earnings-calendar-modes" role="group" aria-label={t('Calendar view')}>
      <button type="button" className={calendarMode==='weekly'?'is-active':undefined} aria-pressed={calendarMode==='weekly'} onClick={()=>setCalendarMode('weekly')}><CalendarDays size={14}/>{t('Weekly')}</button>
      <button type="button" className={calendarMode==='day'?'is-active':undefined} aria-pressed={calendarMode==='day'} onClick={()=>{setCalendarMode('day');if(!days.some(day=>day.date===selectedDay)&&days[0])setSelectedDay(days[0].date);}}><List size={14}/>{t('Day')}</button>
    </div></div>
    {watchError&&<p className="error-banner" role="alert">{watchError}</p>}
    {staleNotice&&<p className="quote-warning" role="status">{t('Showing cached results.')} {staleNotice===UNAVAILABLE?t(UNAVAILABLE):staleNotice} <Button variant="ghost" onClick={()=>setAttempt(n=>n+1)}>{t('Retry')}</Button></p>}

    <div className="earnings-tools">
      <label className="earnings-search">
        <Search size={16} aria-hidden="true"/>
        <Input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Search company or ticker')} aria-label={t('Search company or ticker')}/>
        {query?<button type="button" className="earnings-search-clear" onClick={()=>setQuery('')} aria-label={t('Clear search')}><X size={14}/></button>:null}
      </label>
      <div className="earnings-filters-desktop">{filters(true)}</div>
      <Button type="button" variant="outline" className="earnings-filters-trigger" onClick={()=>setMobileFilters(true)}>{t('Filters')}{chips.length?` · ${chips.length}`:''}</Button>
      <div className="earnings-view-switch" role="group" aria-label={t('View')}>
        <button type="button" className={view==='calendar'?'is-active':undefined} aria-pressed={view==='calendar'} onClick={()=>setView('calendar')}><CalendarDays size={15}/>{t('Calendar')}</button>
        <button type="button" className={view==='table'?'is-active':undefined} aria-pressed={view==='table'} onClick={()=>setView('table')}><List size={15}/>{t('Table')}</button>
      </div>
    </div>

    {chips.length>0&&<div className="earnings-chips">
      <span className="earnings-count">{rows.length} {t('companies')}</span>
      {chips.map(chip=><button type="button" key={chip.key} className="earnings-chip-filter" onClick={()=>{if(chip.key==='q')setQuery('');replace({[chip.key]:null});}}>{chip.label}<X size={12}/></button>)}
      <button type="button" className="earnings-clear" onClick={()=>{setQuery('');replace({q:null,session:null,status:null,cap:null,watch:null});}}>{t('Clear filters')}</button>
    </div>}

    <div className="earnings-toolbar">
      <div className="earnings-week-bar">
        <p className="earnings-week-label">{range||'—'}</p>
        <div className="earnings-week-switch" role="group" aria-label={t('Week')}>
          <button type="button" disabled={!canPrev||loading} aria-label={t('Previous week')} onClick={()=>{if(calendarMode==='day')setSelectedDay(addDays(prev,4));go(prev);}}>
            <ChevronLeft size={16} aria-hidden="true"/>
            <span className="week-full">{t('Previous week')}</span>
            <span className="week-short">{t('Previous')}</span>
          </button>
          <button type="button" disabled={!data||loading||onThisWeek} aria-pressed={onThisWeek} className={onThisWeek?'is-current':undefined} onClick={()=>{if(calendarMode==='day')setSelectedDay(focusDate);go(focusWeek);}}>
            {t('This week')}
          </button>
          <button type="button" disabled={!canNext||loading} aria-label={t('Next week')} onClick={()=>{if(calendarMode==='day')setSelectedDay(next);go(next);}}>
            <span className="week-full">{t('Next week')}</span>
            <span className="week-short">{t('Next')}</span>
            <ChevronRight size={16} aria-hidden="true"/>
          </button>
        </div>
      </div>
      <Button variant="outline" className="outline-button earnings-export" disabled={!rows.length} onClick={exportCsv}><Download size={15}/>{t('Export CSV')}</Button>
    </div>

    {calendarMode==='day'&&<div className="earnings-selected-day-bar">
      <button type="button" aria-label={t('Previous day')} onClick={()=>moveSelectedDay(-1)}><ChevronLeft size={17}/></button>
      <strong>{dayFormat(selectedDay,{weekday:'long',month:'long',day:'numeric',year:'numeric'},locale)}</strong>
      <button type="button" aria-label={t('Next day')} onClick={()=>moveSelectedDay(1)}><ChevronRight size={17}/></button>
      <button type="button" className="earnings-day-today" onClick={()=>{const weekday=new Date(today+'T12:00:00Z').getUTCDay();const target=weekday===0||weekday===6?earningsWeekMonday(today):today;setSelectedDay(target);if(earningsWeekMonday(target)!==data?.weekStart)go(earningsWeekMonday(target));}}>{t('Today')}</button>
    </div>}

    {error&&<div className="error-banner" role="alert">{error===UNAVAILABLE?t(UNAVAILABLE):error}<Button variant="ghost" onClick={()=>setAttempt(n=>n+1)}><T text="Retry"/></Button></div>}
    {emptyCoverage&&<p className="earnings-empty">{t('No earnings announcements in the available coverage for this period.')}</p>}
    {emptyWatch&&<p className="earnings-empty">{t('None of your watchlists have companies in this week.')} <a href="/">{t('Open watchlists')}</a></p>}
    {emptyFilters&&<p className="earnings-empty">{t('No companies match your filters.')} <button type="button" className="earnings-clear" onClick={()=>{setQuery('');replace({q:null,session:null,status:null,cap:null,watch:null});}}>{t('Clear filters')}</button></p>}

    {view==='calendar'&&!!days.length&&!loading&&!emptyCoverage&&!emptyFilters&&!emptyWatch&&<nav className="earnings-day-jump" aria-label={t('Jump to day')}>
      {days.map(day=>{
        const companies=filteredByDay.get(day.date)||[];
        return <a key={day.date} href={'#earnings-'+day.date}>{dayFormat(day.date,{weekday:'short'},locale)} {dayFormat(day.date,{month:'short',day:'numeric'},locale)} · {companies.length}</a>;
      })}
    </nav>}

    {loading?<div className="earnings-week is-loading" role="status">
      {[0,1,2,3,4].map(i=><section key={i} className="earnings-day"><header><strong>&nbsp;</strong></header><p className="earnings-day-note"><LoaderCircle size={14} className="spin"/>{i===0?t('Loading earnings…'):''}</p></section>)}
    </div>:!data||emptyCoverage||emptyFilters||emptyWatch?null:view==='table'?
      <div className="earnings-table-wrap">
        <table className="earnings-table">
          <caption className="sr-only">{t('Earnings comparison')}</caption>
          <thead>
            <tr>
              {([['symbol',t('Company / ticker')],['date',t('Announcement date')],['session',t('Announcement time')],['status',t('Status')],['estimate',t('EPS estimate')],['actual',t('Actual EPS')],['surpriseAbs',t('Difference')],['surprisePct',t('Surprise %')],['cap',t('Market cap')]] as const).map(([key,label])=>
                <th key={key} scope="col" aria-sort={sort.key===key?(sort.dir==='asc'?'ascending':'descending'):'none'}>
                  <button type="button" onClick={()=>setSort(current=>current.key===key?{key,dir:current.dir==='asc'?'desc':'asc'}:{key,dir:key==='symbol'||key==='date'?'asc':'desc'})}>{label}{sort.key===key?(sort.dir==='asc'?' ↑':' ↓'):''}</button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row=>{
              const surprise=epsSurprise(row.eps,row.epsForecast);
              return <tr key={row.symbol+row.date} className={row.date===today?'is-today':undefined}>
                <th scope="row">
                  <button type="button" className="earnings-company-link" onClick={()=>openRow(row)}>
                    <CompanyIcon symbol={row.symbol}/>
                    <span><strong>{row.symbol}</strong><small>{row.name}</small></span>
                    {watchSymbols.has(row.symbol)&&<Star size={12} aria-label={t('On a watchlist')}/>}
                  </button>
                </th>
                <td>{dayFormat(row.date,{weekday:'short',month:'short',day:'numeric'},locale)}</td>
                <td>{timing(row.when)}</td>
                <td>{row.reported?t('Reported'):t('Upcoming')}</td>
                <td className="num">{row.epsForecast?formatEps(row.epsForecast):<span aria-label={t('Not available')}>—</span>}</td>
                <td className="num">{row.eps?formatEps(row.eps):<span aria-label={t('Not available')}>—</span>}</td>
                <td className={'num '+(surprise.tone==='above'?'up':surprise.tone==='below'?'down':'')}>{surprise.difference===null?<span aria-label={t('Not available')}>—</span>:formatEps(surprise.difference)}</td>
                <td className={'num '+(surprise.tone==='above'?'up':surprise.tone==='below'?'down':'')}>{surprise.percent===null?<span aria-label={t('Not available')}>—</span>:`${surprise.percent>0?'+':''}${surprise.percent.toFixed(1)}%`}</td>
                <td className="num">{formatCap(row.marketCap)||'—'}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    :calendarMode==='day'?<section className="earnings-day-focus" aria-live="polite">
      <header><div><strong>{dayFormat(selectedDay,{weekday:'long'},locale)}</strong><span>{dayFormat(selectedDay,{month:'long',day:'numeric'},locale)}</span></div><small>{selectedDayRows.length} {t('companies')}</small></header>
      {!selectedDayBoard?<p className="earnings-day-note">{t('No earnings scheduled')}</p>:selectedDayBoard.status!=='ok'?<p className="earnings-day-note is-error">{t('Could not load this day.')}</p>:selectedDayRows.length?<div className="earnings-focus-list">
        {selectedDayRows.map(row=><div className="earnings-focus-row" key={row.symbol}>
          <button type="button" className="earnings-focus-company" onClick={()=>openRow(row)}><CompanyIcon symbol={row.symbol}/><span><strong>{row.symbol}</strong><small>{row.name}</small>{(timing(row.when)||row.reported)&&<em>{timing(row.when)}{row.reported?`${timing(row.when)?' · ':''}${t('Reported')}`:''}</em>}</span></button>
          <span className="earnings-focus-metric"><small>{t('EPS estimate')}</small><strong>{row.epsForecast?formatEps(row.epsForecast):'—'}</strong></span>
          {(()=>{const quote=dayQuotes[row.symbol];const quoteLoaded=Object.prototype.hasOwnProperty.call(dayQuotes,row.symbol);const current=quote?price(quote.price,quote.currency):quoteLoaded?'—':t('Loading…');const change=quote?.changePercent;const changeText=change==null?(quoteLoaded?'—':t('Loading…')):`${change>0?'+':''}${change.toFixed(2)}%`;const href=stockHref(row.symbol,'/earnings'+(paramKey?'?'+paramKey:''));return <>
            <span className="earnings-focus-metric"><small>{t('Current price')}</small><strong>{isMember?<Link className="earnings-focus-link" href={href}>{current}</Link>:current}</strong></span>
            <span className={'earnings-focus-metric '+(change==null?'':change>=0?'up':'down')}><small>{t('Daily change')}</small><strong>{isMember?<Link className="earnings-focus-link" href={href}>{changeText}</Link>:changeText}</strong></span>
          </>;})()}
        </div>)}
      </div>:<p className="earnings-day-note">{t('No earnings scheduled')}</p>}
    </section>:<div className="earnings-week" aria-live="polite">
        {days.map(day=>{
          const isToday=day.date===today;
          const isFocusDay=day.date===focusDate;
          const companies=filteredByDay.get(day.date)||[];
          return <section id={'earnings-'+day.date} key={day.date} className={'earnings-day'+(isFocusDay?' is-focus-day':'')+(isToday?' is-today':'')+(day.date<today?' is-past':'')}>
            <header>
              <strong>{dayFormat(day.date,{weekday:'short'},locale)}</strong>
              <span>{dayFormat(day.date,{month:'short',day:'numeric'},locale)}</span>
              {isFocusDay&&<em className="earnings-today-tag">{isToday?t('Today'):t('Next week')}</em>}
              <small>{companies.length}</small>
            </header>
            {day.status!=='ok'?<p className="earnings-day-note is-error">{t('Could not load this day.')}</p>
              :companies.length?<ul className="earnings-day-list">
                {(expandedDays.has(day.date)?companies:companies.slice(0,30)).map(row=>{
                  const surprise=epsSurprise(row.eps,row.epsForecast);
                  const detail=row.reported
                    ?`${t('Actual')} ${row.eps?formatEps(row.eps):'—'} · ${t('Estimate')} ${row.epsForecast?formatEps(row.epsForecast):'—'}${surprise.difference===null?'':` · ${formatSurprise(surprise)}`}`
                    :[timing(row.when),row.epsForecast?`${t('Estimate')} ${formatEps(row.epsForecast)}`:''].filter(Boolean).join(' · ');
                  return <li key={row.symbol}>
                    <HoverCard>
                      <HoverCardTrigger type="button" render={<button type="button"/>} className="earnings-chip" onClick={()=>openRow(row)}>
                        <CompanyIcon symbol={row.symbol}/>
                        <span className="earnings-chip-text">
                          <strong>{row.symbol}{watchSymbols.has(row.symbol)&&<Star size={11} aria-label={t('On a watchlist')}/>}</strong>
                          <small className="earnings-company-name">{row.name}</small>
                          {timing(row.when)&&<em>{timing(row.when)}</em>}
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent className="earnings-stock-preview" side="top" align="center" sideOffset={8}>
                        <div className="earnings-preview-heading"><CompanyIcon symbol={row.symbol}/><span><strong>{row.symbol}</strong><small>{row.name}</small></span></div>
                        <dl><div><dt>{t('Announcement date')}</dt><dd>{dayFormat(row.date,{weekday:'short',month:'short',day:'numeric'},locale)}</dd></div>{timing(row.when)&&<div><dt>{t('Announcement time')}</dt><dd>{timing(row.when)}</dd></div>}<div><dt>{row.reported?t('EPS comparison'):t('EPS estimate')}</dt><dd>{detail||'—'}</dd></div></dl>
                        <span className="earnings-preview-hint">{t('Stock details')}</span>
                      </HoverCardContent>
                    </HoverCard>
                  </li>;
                })}
                {companies.length>30&&<li>
                  <button type="button" className="earnings-chip earnings-more-tile" aria-expanded={expandedDays.has(day.date)} onClick={()=>setExpandedDays(current=>{const next=new Set(current);if(next.has(day.date))next.delete(day.date);else next.add(day.date);return next;})}>
                    <span className="earnings-more-count">{expandedDays.has(day.date)?'−':`+${companies.length-30}`}</span>
                    <span className="earnings-chip-text"><strong>{expandedDays.has(day.date)?t('Show less'):t('Show more')}</strong></span>
                  </button>
                </li>}
              </ul>:<p className="earnings-day-note">{t('No earnings scheduled')}</p>}
          </section>;
        })}
      </div>
    }

    <Sheet open={mobileFilters} onOpenChange={setMobileFilters}>
      <SheetContent side="bottom" className="earnings-filter-drawer">
        <SheetHeader><SheetTitle>{t('Filters')}</SheetTitle></SheetHeader>
        {filters(false)}
        <div className="earnings-filter-actions">
          <Button variant="outline" onClick={()=>{setQuery('');replace({q:null,session:null,status:null,cap:null,watch:null});}}>{t('Reset')}</Button>
          <Button className="primary-button" onClick={()=>setMobileFilters(false)}>{t('Apply')}</Button>
        </div>
      </SheetContent>
    </Sheet>
  </main>;
}

function capLabel(cap:Cap,t:(text:string)=>string){
  return cap==='under-1'?t('Under $1B'):cap==='unknown'?t('Market cap unavailable'):cap==='1-10'?t('$1–10B'):cap==='10-50'?t('$10–50B'):cap==='50-200'?t('$50–200B'):t('$200B+');
}
