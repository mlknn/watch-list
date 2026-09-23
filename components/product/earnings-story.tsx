'use client';
import {useT} from '@/components/product/language';
import {T} from '@/components/product/language';
import {useEffect,useMemo,useState} from 'react';
import {LoaderCircle,PanelRightClose,PanelRightOpen} from 'lucide-react';
import {ResponsiveContainer,AreaChart,Area,XAxis,YAxis,Tooltip,ReferenceLine,BarChart,Bar} from 'recharts';
import {useChartPalette} from './theme';
import {apiFetch} from '@/lib/auth-client';
import {marketChart} from '@/lib/market';
import {averageImpact,eventWindows} from '@/lib/earnings-impact.mjs';
import {addDays,isoDay,nextEarningsSoon,nextEarningsTone,todayInMarket} from '@/lib/next-earnings.mjs';
import {Button} from '@/components/ui/button';

type Quarter={periodEnd:string;revenue:number|null;netIncome:number|null;eps:number|null};
type Reports={quarters:Quarter[];currency:string|null;fetchedAt:string};

const compact=(v:number|null)=>v===null?'—':new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:2}).format(v);
const pct=(v:number|null)=>v===null||!Number.isFinite(v)?'—':`${v>=0?'+':''}${v.toFixed(1)}%`;

type EarningsCompany={symbol:string;reported:boolean};
type EarningsDay={date:string;status:string;companies:EarningsCompany[]};
type EarningsWeek={weekStart?:string;days?:EarningsDay[]};

function NextReportNotice({iso}:{iso?:string}){
  const t=useT();
  const day=isoDay(iso);
  const tone=nextEarningsTone(day,todayInMarket());
  if(!tone)return null;
  const label=new Date(day+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'});
  const prefix=tone==='today'?t('The estimated earnings date is today,'):tone==='this-week'?t('The estimated earnings date is this week, on'):tone==='next-week'?t('The estimated earnings date is next week, on'):t('The next estimated earnings date is');
  return <p className={'story-next'+(nextEarningsSoon(tone)?' is-soon':'')} role={nextEarningsSoon(tone)?'status':undefined}>{prefix} {label}. {t('Announcement timing may still be unconfirmed.')}</p>;
}

export function EarningsStory({symbol,nextDate}:{symbol:string;nextDate?:string}){
  const t=useT();
  const palette=useChartPalette();
  const [reports,setReports]=useState<Reports|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [windows,setWindows]=useState<ReturnType<typeof eventWindows>>([]);
  const [calendarDate,setCalendarDate]=useState('');
  useEffect(()=>{
    let alive=true;
    const today=todayInMarket();
    void fetch('/api/earnings-calendar').then(async r=>{
      const current=await r.json() as EarningsWeek;
      const nextMonday=current.weekStart?addDays(current.weekStart,7):'';
      const upcoming=nextMonday?await fetch('/api/earnings-calendar?week='+encodeURIComponent(nextMonday)).then(res=>res.json() as Promise<EarningsWeek>).catch(()=>({days:[]})):{days:[]};
      if(!alive)return;
      const hit=[...(current.days||[]),...(upcoming.days||[])].filter(day=>day.status==='ok').flatMap(day=>(day.companies||[]).map(row=>({...row,date:day.date}))).find(row=>row.symbol===symbol&&!row.reported&&row.date>=today);
      setCalendarDate(hit?.date||'');
    }).catch(()=>{if(alive)setCalendarDate('');});
    return()=>{alive=false;};
  },[symbol]);
  useEffect(()=>{
    let alive=true;
    setLoading(true);setError('');
    void Promise.all([
      apiFetch('/api/stocks/'+encodeURIComponent(symbol)+'/earnings',{},false).then(async r=>{const result=await r.json() as Reports&{error?:string};if(!r.ok)throw Error(result.error||'Unable to load earnings.');return result;}),
      marketChart(symbol,'5y').catch(()=>null),
    ]).then(([data,chart])=>{
      if(!alive)return;
      setReports(data);
      setWindows(eventWindows(chart?.points||[],chart?.earningsDates||[],10));
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[symbol]);
  const impact=useMemo(()=>averageImpact(windows,10),[windows]);
  const mix=useMemo(()=> (reports?.quarters||[]).map(q=>{
    const rev=q.revenue||0;
    const income=q.netIncome||0;
    return {...q,label:new Date(q.periodEnd+'T12:00:00Z').toLocaleDateString(undefined,{month:'short',year:'2-digit',timeZone:'UTC'}),revAbs:Math.abs(rev),incomeAbs:Math.abs(income),incomeNeg:income<0};
  }),[reports]);
  const reportDate=calendarDate||isoDay(nextDate);
  const nextNotice=<NextReportNotice iso={reportDate}/>;
  if(loading)return <section className="earnings-story" role="status">{nextNotice}<span className="story-loading"><LoaderCircle className="spin"/>{t('Loading quarterly results…')}</span></section>;
  if(error)return <section className="earnings-story" role="alert">{nextNotice}<p>{error}</p></section>;
  if(!reports?.quarters.length)return <section className="earnings-story">{nextNotice}<p>{t('No quarterly reports are available for this symbol yet.')}</p></section>;
  const maxRev=Math.max(...mix.map(q=>q.revAbs),1);
  return <div className="earnings-story">
    <section className="story-card">
      <p className="eyebrow"><T text="EARNINGS STORY"/></p>
      {nextNotice}
      <h2><T text="Price around past earnings announcements"/></h2>
      {impact.samples?<>
      <p><T text="Average path of the split-adjusted close around verified announcement dates. This is price behavior around the event, not a cause."/></p>
      <p className="story-meta">{t('Announcement timing is not always supplied. After-close reports use the next regular session.')} {t('Based on')} {impact.samples} {t('announcements')}.</p>
      <div className="story-chart" role="img" aria-label={t('Average return around earnings announcements')}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={impact.path} margin={{top:12,right:8,bottom:0,left:0}}>
            <XAxis dataKey="offset" tickFormatter={v=>v===0?t('Announcement'):String(v)} tick={{fontSize:11}} tickLine={false} axisLine={false}/>
            <YAxis orientation="right" tickFormatter={v=>`${v}%`} width={44} tick={{fontSize:11}} tickLine={false} axisLine={false}/>
            <Tooltip formatter={(value)=>[typeof value==='number'?`${value>=0?'+':''}${value.toFixed(2)}%`: '—',t('Avg. return')]} labelFormatter={v=>v===0?t('Announcement session'):`${Number(v)>0?'+':''}${v} ${t('sessions')}`}/>
            <ReferenceLine x={0} stroke={palette.ref} strokeDasharray="3 4"/>
            <ReferenceLine y={0} stroke={palette.grid}/>
            <Area type="monotone" dataKey="percent" stroke={palette.up} fill={palette.up} fillOpacity={0.18} strokeWidth={2} connectNulls={false} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="story-pills">
        <article><strong className={(impact.day||0)>=0?'up':'down'}>{pct(impact.day)}</strong><span>{t('Avg. return · announcement session')} · {impact.daySamples} {t('samples')}</span></article>
        <article><strong className={(impact.after3||0)>=0?'up':'down'}>{pct(impact.after3)}</strong><span>{t('Avg. return · 3 sessions later')} · {impact.after3Samples} {t('samples')}</span></article>
        <article><strong className={(impact.after30||0)>=0?'up':'down'}>{pct(impact.after30)}</strong><span>{t('Avg. return · 30 sessions later')} · {impact.after30Samples} {t('samples')}</span></article>
        <article><strong className="up">{impact.positive}/{impact.after30Samples}</strong><span>{t('Positive after 30 sessions')}</span></article>
        <article><strong className="up">{pct(impact.best.percent)}</strong><span>{t('Best')} {impact.best.date||'—'}</span></article>
        <article><strong className="down">{pct(impact.worst.percent)}</strong><span>{t('Worst')} {impact.worst.date||'—'}</span></article>
      </div>
      </>:<p className="story-meta">{t('Announcement history is not available for this symbol, so price-around-earnings analysis is omitted. Quarter-end dates are not used as a substitute.')}</p>}
    </section>
    <section className="story-card">
      <p className="eyebrow"><T text="REPORTED RESULTS"/></p>
      <h2><T text="Revenue, income, and EPS"/></h2>
      <p>{t('The latest six reported quarters')}{reports.currency?` · ${reports.currency}`:''}.</p>
      <div className="story-chart" role="img" aria-label={t('Quarterly revenue')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mix} margin={{top:12,right:8,bottom:0,left:0}}>
            <XAxis dataKey="label" tick={{fontSize:11}} tickLine={false} axisLine={false}/>
            <YAxis tickFormatter={v=>new Intl.NumberFormat(undefined,{notation:'compact'}).format(v)} width={48} tick={{fontSize:11}} tickLine={false} axisLine={false}/>
            <Tooltip formatter={(value,name)=>[typeof value==='number'?compact(value):'—',String(name)]}/>
            <Bar dataKey="revenue" name={t('Revenue')} fill={palette.up} radius={[6,6,0,0]} maxBarSize={36}/>
            <Bar dataKey="netIncome" name={t('Net income')} fill={palette.bar} radius={[6,6,0,0]} maxBarSize={36}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="story-lines">
        {mix.map(q=>{
          const qoq=mix[mix.indexOf(q)-1];
          const change=q.revenue!==null&&qoq?.revenue?((q.revenue/qoq.revenue)-1)*100:null;
          return <li key={q.periodEnd}>
            <span className="story-line-label">{q.label}<small>{t('EPS')} {q.eps===null?'—':q.eps.toFixed(2)}</small></span>
            <span className="story-line-bar"><i style={{width:`${Math.max(4,(q.revAbs/maxRev)*100)}%`}}/></span>
            <strong>{compact(q.revenue)}</strong>
            <em className={change===null?'':change>=0?'up':'down'}>{pct(change)}</em>
          </li>;
        })}
      </ul>
      <p className="earnings-note"><T text="Quarter-end dates follow each company’s fiscal calendar. Missing values are blank, never plotted as zero."/></p>
    </section>
  </div>;
}

export function StockFactsRail({open,onToggle,facts,note,groups}:{open:boolean;onToggle:()=>void;facts:[string,string][];note:string;groups?:{title:string;items:[string,string][]}[]}){
  const t=useT();
  const sections=groups?.length?groups:[{title:'',items:facts}];
  return <aside className={'stock-facts-rail'+(open?' is-open':'')}>
    <div className="stock-facts-toolbar">
      <h2><T text="Statistics"/></h2>
      <Button variant="ghost" size="icon" aria-label={open?t('Hide statistics'):t('Show statistics')} onClick={onToggle}>
        {open?<PanelRightClose size={18}/>:<PanelRightOpen size={18}/>}
      </Button>
    </div>
    {open&&sections.map(section=><section key={section.title||'facts'} className="stock-facts-group">{section.title&&<h3>{section.title}</h3>}<dl className="stock-facts-list">{section.items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}
    {open&&<p className="metrics-note">{note}</p>}
  </aside>;
}
