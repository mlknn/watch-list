'use client';
import {useT} from '@/components/product/language';
import {T} from '@/components/product/language';
import {useEffect,useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {ChevronLeft,ChevronRight,LoaderCircle} from 'lucide-react';
import {CompanyIcon} from './company-icon';
import {Button} from '@/components/ui/button';

type Company={symbol:string;name:string;when:string};
type Day={date:string;companies:Company[]};
type Board={weekStart:string;days:Day[];fetchedAt:string};

function shiftWeek(monday:string,delta:number){
  const d=new Date(monday+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+delta*7);
  return d.toISOString().slice(0,10);
}

export function EarningsCalendar(){
  const t=useT();
  const router=useRouter();
  const params=useSearchParams();
  const week=params.get('week')||'';
  const [data,setData]=useState<Board|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const today=useMemo(()=>new Date().toISOString().slice(0,10),[]);
  useEffect(()=>{
    let alive=true;
    setLoading(true);setError('');
    const query=week?'?week='+encodeURIComponent(week):'';
    void fetch('/api/earnings-calendar'+query,{cache:'no-store'}).then(async r=>{
      const result=await r.json() as Board&{error?:string};
      if(!r.ok)throw Error(result.error||'Unable to load the earnings calendar.');
      if(alive)setData(result);
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[week]);
  function go(next:string){
    router.push(next===data?.weekStart&&!week?'/earnings':'/earnings?week='+next);
  }
  const weekday=(iso:string)=>new Date(iso+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'short',timeZone:'UTC'});
  const monthDay=(iso:string)=>new Date(iso+'T12:00:00Z').toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});
  return <main className="earnings-cal-page">
    <div className="page-heading market-heading">
      <div>
        <p className="eyebrow"><T text="US EARNINGS"/></p>
        <h1><T text="This week’s reports."/></h1>
        <p className="intro"><T text="US companies reporting this week, one column per day. Open a ticker for the earnings story and company details."/></p>
      </div>
      <div className="earnings-cal-nav">
        <Button variant="outline" className="outline-button" onClick={()=>data&&go(shiftWeek(data.weekStart,-1))} aria-label={t('Previous week')}><ChevronLeft size={18}/></Button>
        <Button variant="outline" className="outline-button" onClick={()=>go('')}><T text="This week"/></Button>
        <Button variant="outline" className="outline-button" onClick={()=>data&&go(shiftWeek(data.weekStart,1))} aria-label={t('Next week')}><ChevronRight size={18}/></Button>
      </div>
    </div>
    {error&&<p className="error-banner" role="alert">{error}</p>}
    {loading||!data?<div className="earnings-empty" role="status"><LoaderCircle className="spin"/>{t('Loading the US earnings calendar…')}</div>:
      <div className="earnings-week" role="table" aria-label={t('US earnings calendar')}>
        {data.days.map(day=>{
          const isToday=day.date===today;
          return <section key={day.date} className={'earnings-day'+(isToday?' is-today':'')} role="columnheader">
            <header>
              <strong>{weekday(day.date)}</strong>
              <span>{monthDay(day.date)}</span>
              <small>{day.companies.length}</small>
            </header>
            <div className="earnings-day-list">
              {day.companies.length?day.companies.map(row=>
                <a key={row.symbol} href={'/stocks/'+encodeURIComponent(row.symbol)} className="earnings-chip">
                  <CompanyIcon symbol={row.symbol}/>
                  <span>
                    <strong>{row.symbol}</strong>
                    {row.when==='bmo'&&<em>{t('Before open')}</em>}
                    {row.when==='amc'&&<em>{t('After close')}</em>}
                  </span>
                </a>
              ):<p className="earnings-day-empty">{t('No reports listed')}</p>}
            </div>
          </section>;
        })}
      </div>
    }
    <p className="market-footnote"><T text="Nasdaq earnings calendar · US-listed names · Quotes and reports may be delayed."/> {data?new Date(data.fetchedAt).toLocaleString():''}</p>
  </main>;
}
