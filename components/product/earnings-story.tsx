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
import {Button} from '@/components/ui/button';

type Quarter={periodEnd:string;revenue:number|null;netIncome:number|null;eps:number|null};
type Reports={quarters:Quarter[];currency:string|null;fetchedAt:string};

const compact=(v:number|null)=>v===null?'—':new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:2}).format(v);
const pct=(v:number|null)=>v===null||!Number.isFinite(v)?'—':`${v>=0?'+':''}${v.toFixed(1)}%`;

export function EarningsStory({symbol}:{symbol:string}){
  const t=useT();
  const palette=useChartPalette();
  const [reports,setReports]=useState<Reports|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [windows,setWindows]=useState<ReturnType<typeof eventWindows>>([]);
  useEffect(()=>{
    let alive=true;
    setLoading(true);setError('');
    void Promise.all([
      apiFetch('/api/stocks/'+encodeURIComponent(symbol)+'/earnings',{},false).then(async r=>{const result=await r.json() as Reports&{error?:string};if(!r.ok)throw Error(result.error||'Unable to load earnings.');return result;}),
      marketChart(symbol,'5y').catch(()=>null),
    ]).then(([data,chart])=>{
      if(!alive)return;
      setReports(data);
      setWindows(eventWindows(chart?.points||[],(data.quarters||[]).map(q=>q.periodEnd),10));
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[symbol]);
  const impact=useMemo(()=>averageImpact(windows,10),[windows]);
  const mix=useMemo(()=> (reports?.quarters||[]).map(q=>{
    const rev=q.revenue||0;
    const income=q.netIncome||0;
    return {...q,label:new Date(q.periodEnd+'T12:00:00Z').toLocaleDateString(undefined,{month:'short',year:'2-digit',timeZone:'UTC'}),revAbs:Math.abs(rev),incomeAbs:Math.abs(income),incomeNeg:income<0};
  }),[reports]);
  if(loading)return <section className="earnings-story" role="status"><LoaderCircle className="spin"/>{t('Loading quarterly results…')}</section>;
  if(error)return <section className="earnings-story" role="alert">{error}</section>;
  if(!reports?.quarters.length)return <section className="earnings-story"><p>{t('No quarterly reports are available for this symbol yet.')}</p></section>;
  const maxRev=Math.max(...mix.map(q=>q.revAbs),1);
  return <div className="earnings-story">
    <section className="story-card">
      <p className="eyebrow"><T text="EARNINGS STORY"/></p>
      <h2><T text="Historical earnings impact"/></h2>
      <p><T text="Average path of the split-adjusted close around each reported quarter-end, using the last five years of daily prices."/></p>
      <p className="story-meta">{t('Based on')} {impact.samples} {t('quarter-ends')}</p>
      <div className="story-chart" role="img" aria-label={t('Average return before and after quarter-end')}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={impact.path} margin={{top:12,right:8,bottom:0,left:0}}>
            <XAxis dataKey="offset" tickFormatter={v=>v===0?t('Report'):String(v)} tick={{fontSize:11}} tickLine={false} axisLine={false}/>
            <YAxis orientation="right" tickFormatter={v=>`${v}%`} width={44} tick={{fontSize:11}} tickLine={false} axisLine={false}/>
            <Tooltip formatter={(value)=>[typeof value==='number'?`${value>=0?'+':''}${value.toFixed(2)}%`: '—',t('Avg. return')]} labelFormatter={v=>v===0?t('Quarter-end'):`${Number(v)>0?'+':''}${v} ${t('sessions')}`}/>
            <ReferenceLine x={0} stroke={palette.ref} strokeDasharray="3 4"/>
            <ReferenceLine y={0} stroke={palette.grid}/>
            <Area type="monotone" dataKey="percent" stroke={palette.up} fill={palette.up} fillOpacity={0.18} strokeWidth={2} connectNulls={false} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="story-pills">
        <article><strong className={(impact.day||0)>=0?'up':'down'}>{pct(impact.day)}</strong><span>{t('Avg. return · report day')}</span></article>
        <article><strong className={(impact.after3||0)>=0?'up':'down'}>{pct(impact.after3)}</strong><span>{t('Avg. return · 3 sessions later')}</span></article>
        <article><strong className={(impact.after30||0)>=0?'up':'down'}>{pct(impact.after30)}</strong><span>{t('Avg. return · 30 sessions later')}</span></article>
        <article><strong className="up">{impact.positive}/{impact.samples}</strong><span>{t('Positive 30-session quarters')}</span></article>
        <article><strong className="up">{pct(impact.best.percent)}</strong><span>{t('Best')} {impact.best.date||'—'}</span></article>
        <article><strong className="down">{pct(impact.worst.percent)}</strong><span>{t('Worst')} {impact.worst.date||'—'}</span></article>
      </div>
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

export function StockFactsRail({open,onToggle,facts,note}:{open:boolean;onToggle:()=>void;facts:[string,string][];note:string}){
  const t=useT();
  return <aside className={'stock-facts-rail'+(open?' is-open':'')}>
    <div className="stock-facts-toolbar">
      <h2><T text="Statistics"/></h2>
      <Button variant="ghost" size="icon" aria-label={open?t('Hide statistics'):t('Show statistics')} onClick={onToggle}>
        {open?<PanelRightClose size={18}/>:<PanelRightOpen size={18}/>}
      </Button>
    </div>
    {open&&<dl className="stock-facts-list">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {open&&<p className="metrics-note">{note}</p>}
  </aside>;
}
