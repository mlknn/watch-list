'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowDownRight,ArrowUpRight,Maximize2,Moon,Plus,RefreshCw,Share2,Star,LoaderCircle} from 'lucide-react';
import {useT} from '@/components/product/language';
import Link from 'next/link';
import {CompanyIcon} from '@/components/product/company-icon';
import {DailyMove} from '@/components/product/daily-move';
import {EarningsStory} from '@/components/product/earnings-story';
import {PriceChart,type ChartStyle} from '@/components/product/price-chart';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {useIsMobile} from '@/hooks/use-mobile';
import {chartPeriodStats,rangeLabel} from '@/lib/chart-period.mjs';
import {nyseSession} from '@/lib/market-tape.mjs';
import {type MarketChart} from '@/lib/market';
import {filledFacts,netMargin,targetGap,websiteLabel,weekRangePosition,type Fact} from '@/lib/stock-facts.mjs';
import {price,quoteUnit} from '@/lib/watchlist';

type Fundamentals={available:boolean;companyName?:string;description?:string;sector?:string;industry?:string;website?:string;employees?:number;country?:string;marketCap?:number;revenue?:number;netIncome?:number;eps?:number;shares?:number;pe?:number;forwardPe?:number;dividendRate?:number;dividendYield?:number;exDividendDate?:string;beta?:number;analysts?:string;targetPrice?:number;earningsDate?:string;postMarketPrice?:number;postMarketTime?:string;error?:string};
const ranges=[['1d','1D'],['5d','5D'],['1mo','1M'],['3mo','3M'],['6mo','6M'],['ytd','YTD'],['1y','1Y'],['5y','5Y'],['max','Max']];
const compact=(v:number|undefined)=>v===undefined?'':new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:2}).format(v);
const num=(v:number|undefined)=>v===undefined?'':v.toLocaleString(undefined,{maximumFractionDigits:2});

function clock(iso?:string|null){
  if(!iso)return '';
  const date=new Date(iso);
  if(!Number.isFinite(date.getTime()))return '';
  return new Intl.DateTimeFormat(undefined,{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date);
}

export function StockEquity({symbol,data,fund,chart,range,chartStyle,busy,error,favorite,savingFavorite,backHref,backLabel,onRange,onStyle,onRefresh,onFull,onAdd,onFavorite}:{
  symbol:string;data:MarketChart|null;fund:Fundamentals|null;chart:MarketChart|null;range:string;chartStyle:ChartStyle;busy:boolean;error:string;favorite:boolean;savingFavorite:boolean;backHref:string;backLabel:string;
  onRange:(value:string)=>void;onStyle:(value:ChartStyle)=>void;onRefresh:()=>void;onFull:()=>void;onAdd:()=>void;onFavorite:()=>void;
}){
  const t=useT();
  const mobile=useIsMobile();
  const heroRef=useRef<HTMLElement|null>(null);
  const [stuck,setStuck]=useState(false);
  const [copied,setCopied]=useState('');
  useEffect(()=>{
    const node=heroRef.current;
    if(!node||!mobile)return;
    const observer=new IntersectionObserver(([entry])=>setStuck(!entry.isIntersecting),{threshold:0.2});
    observer.observe(node);
    return()=>observer.disconnect();
  },[mobile,data]);
  const quote=data?.quote;
  const unit=quoteUnit({symbol,quoteType:data?.quoteType});
  const formatQuote=(value:number)=>price(value,data?.currency||'USD',unit);
  const change=quote?.changePercent;
  const dollar=quote?.change;
  const direction=change==null?'':change<0?'down':change>0?'up':'flat';
  const ChangeIcon=direction==='down'?ArrowDownRight:ArrowUpRight;
  const session=nyseSession();
  const asOf=clock(quote?.quoteTime);
  const sessionLabel=session.code==='open'?t('Market open'):session.code==='pre'?t('Pre-market'):session.code==='after'?t('After hours'):t('Market closed');
  const sessionDetail=asOf?`${t('As of')} ${asOf}`:'';
  const period=chart&&chart.range===range?chartPeriodStats(chart):null;
  const marker=quote?weekRangePosition(quote.price,quote.fiftyTwoWeekLow??NaN,quote.fiftyTwoWeekHigh??NaN):null;
  const margin=netMargin(fund?.netIncome,fund?.revenue);
  const gap=quote&&fund?.targetPrice!==undefined?targetGap(fund.targetPrice,quote.price):null;
  const site=fund?.website&&/^https?:\/\//.test(fund.website)?fund.website:'';
  const host=websiteLabel(site);
  const money=(v:number|undefined)=>v===undefined?'':formatQuote(v);
  const quick=filledFacts([
    {label:t('Market cap'),value:compact(fund?.marketCap)},
    {label:t('P/E ratio'),value:num(fund?.pe)},
    {label:t('Forward P/E'),value:num(fund?.forwardPe)},
    {label:t('EPS'),value:num(fund?.eps)},
    {label:t('Revenue (TTM)'),value:compact(fund?.revenue)},
    {label:t('52-week range'),value:quote?.fiftyTwoWeekLow==null||quote?.fiftyTwoWeekHigh==null?'':`${formatQuote(quote.fiftyTwoWeekLow)} – ${formatQuote(quote.fiftyTwoWeekHigh)}`},
    {label:t('Volume'),value:quote?.volume==null?'':compact(quote.volume)},
    {label:t('Beta'),value:num(fund?.beta)},
    {label:t('Dividend yield'),value:fund?.dividendYield===undefined?'':(fund.dividendYield*100).toFixed(2)+'%'},
  ]).slice(0,6);
  const groups=[
    {title:t('Valuation'),items:filledFacts([{label:t('Market cap'),value:compact(fund?.marketCap)},{label:t('P/E ratio'),value:num(fund?.pe)},{label:t('Forward P/E'),value:num(fund?.forwardPe)}])},
    {title:t('Financial performance'),items:filledFacts([{label:t('Revenue (TTM)'),value:compact(fund?.revenue)},{label:t('Net income'),value:compact(fund?.netIncome)},{label:t('EPS'),value:num(fund?.eps)},{label:t('Net margin'),value:margin===null?'':`${margin.toFixed(1)}%`}])},
    {title:t('Shares outstanding'),items:filledFacts([{label:t('Shares outstanding'),value:compact(fund?.shares)}])},
    {title:t('Trading'),items:filledFacts([{label:t('Open'),value:quote?.open==null?'':money(quote.open)},{label:t('Previous close'),value:quote?.previousClose==null?'':money(quote.previousClose)},{label:t("Day’s range"),value:quote?.dayLow==null||quote?.dayHigh==null?'':`${formatQuote(quote.dayLow)} – ${formatQuote(quote.dayHigh)}`},{label:t('Volume'),value:quote?.volume==null?'':compact(quote.volume)},{label:t('Beta'),value:num(fund?.beta)}])},
    {title:t('Dividends'),items:filledFacts([{label:t('Dividend yield'),value:fund?.dividendYield===undefined?'':(fund.dividendYield*100).toFixed(2)+'%'},{label:t('Dividend per share'),value:fund?.dividendRate===undefined?'':money(fund.dividendRate)},{label:t('Ex-dividend date'),value:fund?.exDividendDate?new Date(fund.exDividendDate).toLocaleDateString():''}])},
  ].filter(group=>group.items.length);
  const about=[
    [t('Sector'),fund?.sector||''],
    [t('Industry'),fund?.industry||''],
    [t('Employees'),fund?.employees===undefined?'':num(fund.employees)],
    [t('Country'),fund?.country||''],
  ].filter(([,value])=>value);
  async function share(){
    const url=`${location.origin}/stocks/${encodeURIComponent(symbol)}`;
    const title=`${data?.companyName||symbol} (${symbol})`;
    if(navigator.share){
      try{await navigator.share({title,url});return;}catch(e){if((e as Error).name==='AbortError')return;}
    }
    try{await navigator.clipboard.writeText(url);setCopied(t('Link copied.'));}catch{setCopied('');}
  }
  const rangeCard=marker!=null&&quote?.fiftyTwoWeekLow!=null&&quote.fiftyTwoWeekHigh!=null?<section className="story-card stock-range" aria-label={t('52-week range')}>
    <h2>{t('52-week range')}</h2>
    <div className="stock-range-track"><i style={{left:`${Math.min(100,Math.max(0,marker*100))}%`}}/></div>
    <p><span>{t('52-week low')} {formatQuote(quote.fiftyTwoWeekLow)}</span><span>{t('52-week high')} {formatQuote(quote.fiftyTwoWeekHigh)}</span></p>
  </section>:null;
  const rangeControls=<Tabs value={range} onValueChange={v=>onRange(String(v))}><TabsList className="chart-ranges" aria-label={t('Chart time range')}>{ranges.map(([value,label])=><TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}</TabsList></Tabs>;
  const styleControls=<Tabs value={chartStyle} onValueChange={v=>onStyle(v as ChartStyle)}><TabsList className="chart-ranges chart-style-toggle" aria-label={t('Chart type')}><TabsTrigger value="line">{t('Line')}</TabsTrigger><TabsTrigger value="candle">{t('Candle')}</TabsTrigger></TabsList></Tabs>;
  return <main className="stock-page">
    <div className="stock-back-row"><Link className="stock-back" href={backHref}>{backLabel}</Link>{!backHref.startsWith('/earnings')&&<Link className="stock-back" href="/earnings">{t('Earnings calendar')}</Link>}</div>
    <section className="stock-hero" ref={heroRef}>
      <div className="stock-hero-id">
        <CompanyIcon symbol={symbol}/>
        <div>
          <h1>{data?.companyName||fund?.companyName||symbol}</h1>
          <p>{symbol}{data?.exchange?` · ${data.exchange}`:''}{fund?.industry?` · ${fund.industry}`:''}</p>
        </div>
      </div>
      <div className="stock-hero-price">
        {quote?<strong>{formatQuote(quote.price)}</strong>:error?<span className="stock-quiet">{error}</span>:<span className="stock-skel stock-skel-price" aria-live="polite">{t('Loading quote…')}</span>}
        {change!=null&&<span className={direction}>{direction==='down'?<ChangeIcon size={22} aria-hidden="true"/>:direction==='up'?<ChangeIcon size={22} aria-hidden="true"/>:null}{dollar!=null&&Number.isFinite(dollar)?`${dollar>0?'+':''}${formatQuote(dollar)} `:''}({change>0?'+':''}{change.toFixed(2)}%) <span className="sr-only">{t('Today')}</span></span>}
        <p>{sessionLabel}{sessionDetail?` · ${sessionDetail}`:''}</p>
        {fund?.postMarketPrice!==undefined&&<p className="stock-after"><Moon size={13} aria-hidden="true"/>{formatQuote(fund.postMarketPrice)} · {t('After hours')}{fund.postMarketTime?` · ${clock(fund.postMarketTime)}`:''}</p>}
      </div>
      <div className="stock-hero-actions">
        <Button className="primary-button" onClick={onAdd}><Plus/>{t('Add to watchlist')}</Button>
        <Button variant="outline" className={'outline-button favorite-action'+(favorite?' is-on':'')} aria-label={`${favorite?t('Remove from favorites'):t('Add to favorites')} ${symbol}`} disabled={savingFavorite} onClick={onFavorite}><Star size={16} fill={favorite?'currentColor':'none'}/>{favorite?t('Favorited'):t('Favorite')}</Button>
        <Button variant="outline" className="outline-button" onClick={()=>void share()}><Share2 size={16}/>{t('Share')}</Button>
        <Button variant="ghost" className="stock-full-chart" disabled={!chart} onClick={onFull}><Maximize2 size={16}/>{t('Full chart')}</Button>
      </div>
      {copied&&<p className="share-notice" aria-live="polite">{copied}</p>}
    </section>
    <section className="stock-quick" aria-label={t('Key statistics')}>
      {fund===null&&!quote?Array.from({length:6},(_,i)=><div key={i} className="stock-skel"/>):quick.map((item:Fact)=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
    </section>
    <div className="stock-move-row">
      <DailyMove symbol={symbol} chart={data} earningsDate={fund?.earningsDate}/>
      {rangeCard}
    </div>
    <section className="main-chart-panel story-card stock-chart">
      <div className="stock-chart-head">
        <div><h2>{t('Price history')}</h2>{period?.changePercent!=null&&<p className={period.changePercent>0?'up':period.changePercent<0?'down':'flat'}>{rangeLabel(range)} {period.changePercent>0?'▲ +':period.changePercent<0?'▼ ':' '}{Math.abs(period.changePercent).toFixed(2)}%</p>}</div>
        <Button variant="ghost" size="icon" aria-label={t('Refresh stock chart')} disabled={busy} onClick={onRefresh}><RefreshCw className={busy?'spin':''}/></Button>
      </div>
      <div className="chart-toolbar">{styleControls}{rangeControls}</div>
      <div className="chart-stage" aria-busy={busy}>{error?<div className="chart-empty" role="alert">{t('Chart temporarily unavailable.')} <Button variant="ghost" onClick={onRefresh}>{t('Retry')}</Button></div>:chart&&chart.range===range?<PriceChart data={chart} style={chartStyle} eventDates={chart.earningsDates}/>:<div className="chart-empty" aria-live="polite"><LoaderCircle className="spin"/>{t('Loading chart…')}</div>}</div>
    </section>
    <EarningsStory symbol={symbol} nextDate={fund?.earningsDate}/>
    <div className="stock-lower">
      <div className="stock-lower-main">
        {fund&&!fund.available&&<p className="stock-quiet">{fund.error||t('Some company statistics are unavailable from the provider.')}</p>}
        {groups.map(group=><section key={group.title} className="story-card stock-facts"><h2>{group.title}</h2><dl>{group.items.map((item:Fact)=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>)}
      </div>
      <aside className="stock-lower-side">
        <section className="story-card">
          <h2>{t('About')} {data?.companyName||fund?.companyName||symbol}</h2>
          {fund===null?<p className="stock-skel stock-skel-copy"/>:fund.description?<p className="stock-about">{fund.description}</p>:<p className="stock-quiet">{t('Company description is currently unavailable.')}</p>}
          {!!about.length&&<dl className="company-facts">{about.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
          {site&&host&&<a href={site} target="_blank" rel="noreferrer">{host}</a>}
        </section>
        {(fund?.analysts||fund?.targetPrice!==undefined)&&quote&&<section className="story-card" aria-label={t('Analyst consensus')}>
          <h2>{t('Analyst consensus')}</h2>
          <dl className="stock-facts-list">
            {fund.analysts&&<div><dt>{t('Analyst consensus')}</dt><dd>{fund.analysts.replace(/_/g,' ')}</dd></div>}
            {fund.targetPrice!==undefined&&<div><dt>{t('Price target')}</dt><dd>{formatQuote(fund.targetPrice)}</dd></div>}
            <div><dt>{t('Current price')}</dt><dd>{formatQuote(quote.price)}</dd></div>
            {gap!=null&&<div><dt>{gap>=0?t('Upside'):t('Downside')}</dt><dd className={gap>=0?'up':'down'}>{gap>=0?'▲ +':'▼ '}{Math.abs(gap).toFixed(1)}%</dd></div>}
          </dl>
        </section>}
      </aside>
    </div>
    <footer className="workspace-footer"><span>{t('Yahoo Finance · Quotes may be delayed · Refreshes every 60 seconds')}</span></footer>
    {mobile&&stuck&&<div className="stock-sticky-cta"><span>{quote?formatQuote(quote.price):symbol}</span><Button className="primary-button" onClick={onAdd}><Plus/>{t('Add to watchlist')}</Button></div>}
  </main>;
}
