'use client';
import {useLang,useT} from '@/components/product/language';
import {T} from '@/components/product/language';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {CalendarDays,ChevronLeft,ChevronRight,Download,List,LoaderCircle,Search,Star,X} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Calendar} from '@/components/ui/calendar';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {apiJson,signedIn} from '@/lib/auth-client';
import {readGuestState} from '@/lib/guest-watchlist.mjs';
import {addDays,mondayOnOrBefore,todayInMarket} from '@/lib/next-earnings.mjs';
import type {AccountState} from '@/lib/watchlist';
import {epsSurprise,filterEarningsRows,formatCap,formatEps,formatSurprise,parseEps,summaryCounts,weekRangeLabel} from '@/lib/earnings-compare.mjs';

type Company={symbol:string;name:string;when:string;reported:boolean;eps:string;epsForecast:string;marketCap?:number};
type Day={date:string;status:string;companies:Company[]};
type Board={weekStart:string;weekEnd:string;days:Day[];minWeek:string;maxWeek:string;todayMonday:string;source:string;timezone:string;fetchedAt:string};
type Row=Company&{date:string;dayStatus:string};
type Session='bmo'|'amc'|'during'|'unknown';
type Status='upcoming'|'reported';
type Cap='1-10'|'10-50'|'50-200'|'200+';
type View='calendar'|'table';
type SortKey='symbol'|'date'|'session'|'status'|'estimate'|'actual'|'surprise'|'cap';

function shiftWeek(monday:string,delta:number){
  return addDays(monday,delta*7);
}
const localeOf=(lang:string)=>lang==='tr'?'tr-TR':lang==='es'?'es-ES':'en-US';
const dayFormat=(iso:string,options:Intl.DateTimeFormatOptions,locale='en-US')=>new Date(iso+'T12:00:00Z').toLocaleDateString(locale,{...options,timeZone:'UTC'});
const stampFormat=(iso:string,locale='en-US')=>{
  const date=new Date(iso);
  return Number.isFinite(date.getTime())?date.toLocaleString(locale,{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'';
};
const UNAVAILABLE='The earnings calendar is temporarily unavailable.';
const VIEW_KEY='earnings:view';
const weekStore=new Map<string,Board>();

async function pullWeek(monday:string){
  const query=monday?'?week='+encodeURIComponent(monday):'';
  const r=await fetch('/api/earnings-calendar'+query);
  const result=await r.json() as Board&{error?:string};
  if(!r.ok)throw Error(result.error||UNAVAILABLE);
  weekStore.set(result.weekStart,result);
  if(!monday)weekStore.set('',result);
  return result;
}
function cachedWeek(monday:string){return weekStore.get(monday)||(!monday?weekStore.get(''):undefined);}

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
  const [selected,setSelected]=useState<Row|null>(null);
  const [sort,setSort]=useState<{key:SortKey;dir:'asc'|'desc'}>({key:'cap',dir:'desc'});
  const [mobileFilters,setMobileFilters]=useState(false);
  const [view,setViewState]=useState<View>(()=>{
    const url=params.get('view');
    return url==='table'||url==='calendar'?url:'calendar';
  });
  const triggerRef=useRef<HTMLButtonElement|null>(null);
  const today=useMemo(()=>todayInMarket(),[]);
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
          const state=await apiJson<AccountState>('/api/watchlists');
          if(!alive)return;
          const symbols=new Set(state.watchlists.flatMap(list=>list.stocks.map(stock=>stock.symbol)));
          setWatchSymbols(symbols);
          return;
        }
      }catch{/* Fall through to the device list. */}
      const guest=readGuestState(window.localStorage);
      if(!alive)return;
      const symbols=new Set(guest.watchlists.flatMap(list=>list.stocks.map(stock=>stock.symbol)));
      setWatchSymbols(symbols);
    })();
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    let alive=true;
    const hit=cachedWeek(week);
    if(hit){setData(hit);setLoading(false);setError('');}
    else{setLoading(true);setError('');}
    void pullWeek(week).then(result=>{if(!alive)return;setData(result);setLoading(false);}).catch(e=>{if(alive&&!hit){setError(e.message||UNAVAILABLE);setLoading(false);}});
    return()=>{alive=false;};
  },[week,attempt]);

  useEffect(()=>{
    if(!data)return;
    const ahead=data.weekStart===data.todayMonday?4:data.weekStart>data.todayMonday?3:2;
    let cancelled=false;
    const run=async()=>{
      for(let i=1;i<=ahead;i++){
        await new Promise(resolve=>window.setTimeout(resolve,280));
        if(cancelled)return;
        const monday=shiftWeek(data.weekStart,i);
        if(monday>data.maxWeek)return;
        if(weekStore.has(monday))continue;
        try{await pullWeek(monday);}catch{/* Keep the open week as-is if a later week misses. */}
      }
    };
    void run();
    return()=>{cancelled=true;};
  },[data?.weekStart,data?.todayMonday,data?.maxWeek]);

  const replace=(patch:Record<string,string|null>)=>{
    const next=new URLSearchParams(params.toString());
    for(const [key,value] of Object.entries(patch)){
      if(!value)next.delete(key);
      else next.set(key,value);
    }
    const queryString=next.toString();
    router.push(queryString?'/earnings?'+queryString:'/earnings');
  };

  const go=useCallback((next:string)=>{
    if(!data||next<data.minWeek||next>data.maxWeek)return;
    replace({week:next===data.todayMonday?null:next});
  },[data,params]);

  const setView=(next:View)=>{
    setViewState(next);
    try{window.localStorage.setItem(VIEW_KEY,next);}catch{/* View still updates in the URL. */}
    replace({view:next==='calendar'?null:next});
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
      replace({q:query.trim()||null});
    },250);
    return()=>window.clearTimeout(timer);
  },[query,paramKey]);

  const timing=(when:string)=>when==='bmo'?t('Before open')
    :when==='amc'?t('After close')
    :when==='during'?t('During market hours')
    :t('Time not supplied');
  const toneLabel=(tone:string)=>tone==='above'?t('Above estimate'):tone==='below'?t('Below estimate'):tone==='inline'?t('In line'):'';

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
    for(const list of map.values())list.sort((a,b)=>(b.marketCap||0)-(a.marketCap||0));
    return map;
  },[rows]);

  const sortedRows=useMemo(()=>{
    const copy=[...rows];
    const dir=sort.dir==='asc'?1:-1;
    const surpriseValue=(row:Row)=>{
      const result=epsSurprise(row.eps,row.epsForecast);
      return result.percent??(result.difference===null?null:result.difference);
    };
    copy.sort((a,b)=>{
      const missing=(value:number|null)=>value===null||!Number.isFinite(value);
      let av:number|string|null=0,bv:number|string|null=0;
      if(sort.key==='symbol'){av=a.symbol;bv=b.symbol;}
      else if(sort.key==='date'){av=a.date;bv=b.date;}
      else if(sort.key==='session'){av=a.when;bv=b.when;}
      else if(sort.key==='status'){av=a.reported?1:0;bv=b.reported?1:0;}
      else if(sort.key==='estimate'){av=parseEps(a.epsForecast);bv=parseEps(b.epsForecast);}
      else if(sort.key==='actual'){av=parseEps(a.eps);bv=parseEps(b.eps);}
      else if(sort.key==='surprise'){av=surpriseValue(a);bv=surpriseValue(b);}
      else {av=a.marketCap||0;bv=b.marketCap||0;}
      if(typeof av==='number'||av===null||typeof bv==='number'||bv===null){
        if(missing(av as number|null)&&missing(bv as number|null))return a.symbol.localeCompare(b.symbol);
        if(missing(av as number|null))return 1;
        if(missing(bv as number|null))return -1;
        return ((av as number)-(bv as number))*dir || a.symbol.localeCompare(b.symbol);
      }
      return String(av).localeCompare(String(bv))*dir || a.symbol.localeCompare(b.symbol);
    });
    return copy;
  },[rows,sort]);

  const days=data?.days||[];
  const prev=data?shiftWeek(data.weekStart,-1):'';
  const next=data?shiftWeek(data.weekStart,1):'';
  const canPrev=!!data&&prev>=data.minWeek;
  const canNext=!!data&&next<=data.maxWeek;
  const onThisWeek=!!data&&data.weekStart===data.todayMonday;
  const range=data?weekRangeLabel(data.weekStart,data.weekEnd):'';
  const chips=[
    query?{key:'q',label:`“${query}”`}:null,
    watchOnly?{key:'watch',label:t('My watchlists')}:null,
    session?{key:'session',label:timing(session)}:null,
    status?{key:'status',label:status==='reported'?t('Reported'):t('Upcoming')}:null,
    cap?{key:'cap',label:capLabel(cap,t)}:null,
  ].filter(Boolean) as {key:string;label:string}[];
  const summary=summaryCounts(rows,today,data?.weekStart||'',data?.weekEnd||'',watchSymbols);
  const failedDays=days.some(day=>day.status!=='ok');
  const emptyCoverage=!loading&&!!data&&days.every(day=>day.status==='ok'&&!day.companies.length);
  const emptyWatch=!loading&&!!data&&watchOnly&&watchSymbols.size===0;
  const emptyFilters=!loading&&!!data&&!rows.length&&!emptyCoverage&&!emptyWatch;

  function openRow(row:Row,el:HTMLButtonElement|null){
    triggerRef.current=el;
    setSelected(row);
  }
  function closePanel(){
    setSelected(null);
    triggerRef.current?.focus();
  }
  function exportCsv(){
    const header=['Ticker','Company','Announcement date','Session','Status','EPS estimate','Actual EPS','EPS surprise','Market cap USD'];
    const lines=sortedRows.map(row=>{
      const surprise=epsSurprise(row.eps,row.epsForecast);
      return [
        row.symbol,
        `"${row.name.replace(/"/g,'""')}"`,
        row.date,
        timing(row.when),
        row.reported?t('Reported'):t('Upcoming'),
        row.epsForecast||'',
        row.eps||'',
        formatSurprise(surprise),
        row.marketCap||'',
      ].join(',');
    });
    const blob=new Blob([[header.join(','),`Timezone,America/New_York`,`Source,Nasdaq`,`Updated,${data?.fetchedAt||''}`,'',...lines].join('\n')],{type:'text/csv'});
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

  return <main className="earnings-cal-page">
    <div className="earnings-cal-head">
      <h1><T text="Earnings calendar"/></h1>
      <p className="intro"><T text="Track upcoming announcements and compare reported results with market expectations."/></p>
      <p className="earnings-meta">
        {t('Source: Nasdaq')} · {t('US-listed companies above $1B')} · {t('New York time')} · {t('Past weeks go back two quarters.')}
        {data?` · ${t('Last successful update')} ${stampFormat(data.fetchedAt,locale)}.`:''}
        {failedDays?` ${t('Some days in this week could not be refreshed.')}`:''}
      </p>
    </div>

    <dl className="earnings-summary">
      <div><dt>{t('This week')}</dt><dd>{summary.week}</dd></div>
      <div><dt>{t('Today')}</dt><dd>{summary.today}</dd></div>
      <div><dt>{t('Reported')}</dt><dd>{summary.reported}</dd></div>
      <div><dt>{t('In my watchlists')}</dt><dd>{summary.watch}</dd></div>
    </dl>

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
      <div className="earnings-range">
        <Popover>
          <PopoverTrigger render={<button type="button" className="earnings-range-button" aria-label={t('Pick a week')}/>}>{range||'—'}</PopoverTrigger>
          <PopoverContent className="earnings-date-pop" align="start">
            {data&&<Calendar
              mode="single"
              selected={new Date(data.weekStart+'T12:00:00Z')}
              onSelect={date=>{
                if(!date)return;
                const iso=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
                go(mondayOnOrBefore(iso));
              }}
              disabled={date=>{
                const iso=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
                const monday=mondayOnOrBefore(iso);
                return !data||monday<data.minWeek||monday>data.maxWeek;
              }}
            />}
          </PopoverContent>
        </Popover>
      </div>
      <div className="earnings-cal-nav">
        <Button variant="outline" className="outline-button" disabled={!canPrev} aria-label={t('Previous week')} onClick={()=>go(prev)}><ChevronLeft size={16}/><span>{t('Previous week')}</span></Button>
        <Button variant="outline" className="outline-button" disabled={!data||onThisWeek} onClick={()=>go(data?.todayMonday||'')}><T text="This week"/></Button>
        <Button variant="outline" className="outline-button" disabled={!canNext} aria-label={t('Next week')} onClick={()=>go(next)}><span>{t('Next week')}</span><ChevronRight size={16}/></Button>
        <Button variant="outline" className="outline-button" disabled={!rows.length} onClick={exportCsv}><Download size={15}/>{t('Export CSV')}</Button>
      </div>
    </div>

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
              {([['symbol',t('Company / ticker')],['date',t('Announcement date')],['session',t('Announcement time')],['status',t('Status')],['estimate',t('EPS estimate')],['actual',t('Actual EPS')],['surprise',t('EPS surprise')],['cap',t('Market cap')]] as const).map(([key,label])=>
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
                  <button type="button" className="earnings-company-link" onClick={e=>openRow(row,e.currentTarget)}>
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
                <td className={'num '+(surprise.tone==='above'?'up':surprise.tone==='below'?'down':'')}>{surprise.difference===null?<span aria-label={t('Not available')}>—</span>:<>{formatSurprise(surprise)} <small>{toneLabel(surprise.tone)}</small></>}</td>
                <td className="num">{formatCap(row.marketCap||0)||'—'}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    :
      <div className="earnings-week" aria-live="polite">
        {days.map(day=>{
          const isToday=day.date===today;
          const companies=filteredByDay.get(day.date)||[];
          return <section id={'earnings-'+day.date} key={day.date} className={'earnings-day'+(isToday?' is-today':'')+(day.date<today?' is-past':'')}>
            <header>
              <strong>{dayFormat(day.date,{weekday:'short'},locale)}</strong>
              <span>{dayFormat(day.date,{month:'short',day:'numeric'},locale)}</span>
              {isToday&&<em className="earnings-today-tag">{t('Today')}</em>}
              <small>{companies.length}</small>
            </header>
            {day.status!=='ok'?<p className="earnings-day-note is-error">{t('Could not load this day.')}</p>
              :companies.length?<ul className="earnings-day-list">
                {companies.map(row=>{
                  const surprise=epsSurprise(row.eps,row.epsForecast);
                  return <li key={row.symbol}>
                    <button type="button" className="earnings-chip" onClick={e=>openRow(row,e.currentTarget)}>
                      <CompanyIcon symbol={row.symbol}/>
                      <span className="earnings-chip-text">
                        <strong>{row.symbol}{row.reported&&<i className="earnings-reported">{t('Reported')}</i>}{watchSymbols.has(row.symbol)&&<Star size={11} aria-label={t('On a watchlist')}/>}</strong>
                        <small>{row.name}</small>
                        <em>{row.reported
                          ?`${t('Actual')} ${row.eps?formatEps(row.eps):'—'} · ${t('Estimate')} ${row.epsForecast?formatEps(row.epsForecast):'—'}${surprise.difference===null?'':` · ${formatSurprise(surprise)}`}`
                          :`${timing(row.when)}${row.epsForecast?` · ${t('Estimate')} ${formatEps(row.epsForecast)}`:''}`}</em>
                      </span>
                    </button>
                  </li>;
                })}
              </ul>:<p className="earnings-day-note">{t('No earnings scheduled')}</p>}
          </section>;
        })}
      </div>
    }

    <Sheet open={!!selected} onOpenChange={open=>{if(!open)closePanel();}}>
      <SheetContent className="earnings-detail-sheet sm:max-w-[480px]" side="right">
        {selected&&<>
          <SheetHeader className="earnings-detail-header">
            <a className="earnings-detail-company" href={'/stocks/'+encodeURIComponent(selected.symbol)}>
              <CompanyIcon symbol={selected.symbol}/>
              <span>
                <SheetTitle>{selected.symbol}</SheetTitle>
                <SheetDescription>{selected.name}</SheetDescription>
              </span>
            </a>
          </SheetHeader>
          <div className="earnings-detail">
            <a className="solid-link earnings-detail-action" href={'/stocks/'+encodeURIComponent(selected.symbol)}>{t('Stock details')}</a>
            <p>{watchSymbols.has(selected.symbol)?t('On a watchlist'):t('Not on a watchlist')} · <a href="/">{t('Open watchlists')}</a></p>
            <dl>
              <div><dt>{t('Announcement date')}</dt><dd>{dayFormat(selected.date,{weekday:'long',month:'long',day:'numeric',year:'numeric'},locale)}</dd></div>
              <div><dt>{t('Announcement time')}</dt><dd>{timing(selected.when)} · {t('New York time')}</dd></div>
              <div><dt>{t('Status')}</dt><dd>{selected.reported?t('Reported'):t('Upcoming')}</dd></div>
              <div><dt>{t('Market cap')}</dt><dd>{formatCap(selected.marketCap||0)||'—'}</dd></div>
            </dl>
            <section>
              <h3>{t('EPS comparison')}</h3>
              <dl className="earnings-compare">
                <div><dt>{t('Estimate')}</dt><dd>{selected.epsForecast?formatEps(selected.epsForecast):'—'}</dd></div>
                <div><dt>{t('Actual')}</dt><dd>{selected.eps?formatEps(selected.eps):'—'}</dd></div>
                {(()=>{const surprise=epsSurprise(selected.eps,selected.epsForecast);return <>
                  <div><dt>{t('Difference')}</dt><dd>{surprise.difference===null?'—':formatEps(surprise.difference)}</dd></div>
                  <div><dt>{t('Surprise %')}</dt><dd className={surprise.tone==='above'?'up':surprise.tone==='below'?'down':''}>{surprise.percent===null?(surprise.difference===null?'—':t('Percent not shown when the estimate is zero')):`${surprise.percent>0?'+':''}${surprise.percent.toFixed(1)}%`}{surprise.tone!=='neutral'?` · ${toneLabel(surprise.tone)}`:''}</dd></div>
                </>;})()}
              </dl>
              <p className="earnings-detail-note">{t('Revenue, fiscal period, and company guidance are not in this Nasdaq calendar feed.')}</p>
            </section>
            <p className="earnings-detail-note">{t('Source: Nasdaq')} · {data?`${t('Last successful update')} ${stampFormat(data.fetchedAt,locale)}`:''}</p>
          </div>
        </>}
      </SheetContent>
    </Sheet>

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
  return cap==='1-10'?t('$1–10B'):cap==='10-50'?t('$10–50B'):cap==='50-200'?t('$50–200B'):t('$200B+');
}
