'use client';
import {CompanyIcon} from './company-icon';
import {T,useT} from '@/components/product/language';
import {useEffect,useRef,useState,useId} from 'react';
import {TrendingUp,ArrowUpRight} from 'lucide-react';
import {Area,AreaChart,CartesianGrid,ReferenceLine,Tooltip,XAxis,YAxis} from 'recharts';
import {ChartContainer} from '@/components/ui/chart';
import {price} from '@/lib/watchlist';
import {useChartPalette} from '@/components/product/theme';
export type Row={symbol:string;name:string;companyName:string;date:string;addedPrice:number;currentPrice:number;currency:string;changePercent:number;quoteTime:string};
export type ShowcaseData={stocks:Row[];method:string;performance:{startDate:string;initialValue:number;currentValue:number;changePercent:number;investmentPerStock:number;quoteTime:string;points:{time:number;value:number;changePercent:number}[]}};

function useLiveNumber(value:number){
 const [shown,setShown]=useState(value);
 const from=useRef(value);
 const ready=useRef(false);
 useEffect(()=>{
  if(!Number.isFinite(value))return;
  if(!ready.current){ready.current=true;from.current=value;setShown(value);return;}
  if(typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){from.current=value;setShown(value);return;}
  const start=from.current,t0=performance.now();
  let frame=0;
  const tick=(now:number)=>{
   const p=Math.min(1,(now-t0)/800);
   const eased=1-(1-p)**3;
   setShown(start+(value-start)*eased);
   if(p<1)frame=requestAnimationFrame(tick);
   else from.current=value;
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[value]);
 return shown;
}

function LivePrice({value,currency}:{value:number;currency:string}){
 return <>{price(useLiveNumber(value),currency)}</>;
}
export function LivePercent({value,digits=2}:{value:number;digits?:number}){
 const shown=useLiveNumber(value);
 return <>{shown>=0?'+':''}{shown.toLocaleString(undefined,{minimumFractionDigits:digits,maximumFractionDigits:digits})}%</>;
}
function SampleRow({stock}:{stock:Row}){
 const t=useT();
 const prev=useRef(stock.currentPrice);
 const [tick,setTick]=useState('');
 useEffect(()=>{
  if(stock.currentPrice===prev.current)return;
  setTick(stock.currentPrice>prev.current?'tick-up':'tick-down');
  prev.current=stock.currentPrice;
  const timer=window.setTimeout(()=>setTick(''),700);
  return()=>clearTimeout(timer);
 },[stock.currentPrice]);
 return <a className={`sample-row ${tick}`} href={'/stocks/'+stock.symbol}>
  <CompanyIcon symbol={stock.symbol}/>
  <div><strong>{stock.name}</strong><small>Sep 3, 2021 · {price(stock.addedPrice,stock.currency)}</small></div>
  <div className={`sample-return ${stock.changePercent>=0?'up':'down'}`}><LivePercent value={stock.changePercent}/><small><LivePrice value={stock.currentPrice} currency={stock.currency}/> {t("now")}</small></div>
 </a>;
}

/** One live fetch for the home page, shared by the watchlist preview and the example below it. */
export function useShowcase(){
 const [data,setData]=useState<ShowcaseData|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true,running=false;
  async function load(){
   if(running)return;running=true;
   try{
    const r=await fetch('/api/showcase',{cache:'no-store'});
    const result=await r.json() as ShowcaseData&{error?:string};
    if(!r.ok)throw Error(result.error);
    if(alive){setData(result);setError('');}
   }catch{if(alive)setError('Market data is temporarily unavailable. Please check back shortly.');}
   finally{running=false;}
  }
  void load();
  const timer=setInterval(()=>{if(!document.hidden)void load();},15000);
  return()=>{alive=false;clearInterval(timer);};
 },[]);
 return {data,error};
}

export function SamplePortfolio({data,error}:{data:ShowcaseData|null;error:string}){
 const t=useT();
 const palette=useChartPalette();
 const id=useId().replace(/:/g,'');
 const performance=data?.performance,up=(performance?.changePercent??0)>=0,color=up?palette.up:palette.down;
 return <section className="home-sample" id="example">
  <div className="home-sample-head">
   <h2><T text="One example, running since September 3, 2021."/></h2>
   <p><T text="Ten companies, an equal starting amount each, priced with real quotes. A watchlist keeps the price from the day you add a stock — earlier dates are not backtested."/></p>
  </div>
  <div className="home-sample-body">
   <div className="hero-preview real-preview expanded-preview">
    <div className="example-column-labels"><span><T text="Company / starting price"/></span><span><T text="Change / latest price"/></span></div>
    {data?data.stocks.map(s=><SampleRow key={s.symbol} stock={s}/>):<div className="showcase-loading" role="status">{error||t("Loading companies and their story since 2021…")}</div>}
   </div>
   <div className="showcase-performance">
    {performance?<>
     <div className="showcase-results">
      <div>
       <span className="performance-label"><T text="Since September 3, 2021"/></span>
       <strong className={`showcase-total ${up?'up':'down'}`}><LivePercent value={performance.changePercent}/><TrendingUp aria-hidden="true"/></strong>
       <span className="performance-label">{up?t("Cumulative gain"):t("Cumulative loss")}</span>
      </div>
      <div className="showcase-value-summary">
       <div><span><T text="Starting value"/></span><strong>{price(performance.initialValue,'USD')}</strong></div>
       <div><span><T text="Latest value"/></span><strong><LivePrice value={performance.currentValue} currency="USD"/></strong></div>
      </div>
     </div>
     <ChartContainer className="showcase-performance-chart" config={{changePercent:{label:'Watchlist return',color}}}><AreaChart accessibilityLayer data={performance.points} margin={{top:16,left:0,right:8,bottom:4}}><defs><linearGradient id={'showcase-'+id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={.22}/><stop offset="1" stopColor={color} stopOpacity={.01}/></linearGradient></defs><CartesianGrid vertical={false} stroke={palette.grid}/><XAxis dataKey="time" type="number" domain={['dataMin','dataMax']} tickCount={6} minTickGap={40} tickFormatter={v=>String(new Date(v).getFullYear())} axisLine={false} tickLine={false}/><YAxis orientation="right" width={58} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false}/><ReferenceLine y={0} stroke={palette.ref} strokeDasharray="4 4"/><Tooltip labelFormatter={v=>new Date(Number(v)).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})} formatter={v=>[`${Number(v)>=0?'+':''}${Number(v).toFixed(2)}%`,'Watchlist return']} contentStyle={{background:palette.tooltipBg,border:`1px solid ${palette.tooltipBorder}`,borderRadius:10,color:palette.tooltipFg}}/><Area dataKey="changePercent" type="linear" stroke={color} strokeWidth={2.5} fill={`url(#showcase-${id})`} isAnimationActive={false}/></AreaChart></ChartContainer>
     <div className="showcase-performance-foot"><p>{data!.method}<br/>Yahoo Finance · Monthly historical samples plus latest quotes · As of {new Date(performance.quoteTime).toLocaleString()}. Quotes may be delayed.{error&&<><br/><span className="quote-failed">{error} Last loaded data is shown.</span></>}</p><a className="quiet-link" href="/watchlists"><T text="Build a watchlist"/><ArrowUpRight size={16}/></a></div>
    </>:<div className="chart-empty" role="status">{error||t("Calculating the watchlist’s five-year performance…")}</div>}
   </div>
  </div>
 </section>;
}
