'use client';
import {useId,useMemo} from 'react';
import {Area,AreaChart,CartesianGrid,ReferenceLine,Tooltip,XAxis,YAxis} from 'recharts';
import {ChartContainer} from '@/components/ui/chart';
import {type ChartPoint,type MarketChart} from '@/lib/market';
import {chartPeriodStats,rangeLabel} from '@/lib/chart-period.mjs';
import {chartEventMarks} from '@/lib/earnings-impact.mjs';
import {price} from '@/lib/watchlist';
import {useChartPalette} from '@/components/product/theme';
import {useT} from '@/components/product/language';

export type ChartStyle='line'|'candle';

function downsample(points:ChartPoint[],max:number){
  if(points.length<=max)return points;
  const size=Math.ceil(points.length/max);
  const out:ChartPoint[]=[];
  for(let i=0;i<points.length;i+=size){
    const slice=points.slice(i,i+size);
    const open=slice[0].open??slice[0].price;
    const close=slice.at(-1)!.price;
    const high=Math.max(...slice.map(p=>p.high??p.price));
    const low=Math.min(...slice.map(p=>p.low??p.price));
    out.push({...slice.at(-1)!,open,high,low,price:close});
  }
  return out;
}

function markLabel(iso:string){
  return new Date(iso+'T12:00:00Z').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'2-digit',timeZone:'UTC'});
}

function CandleChart({data,compact,className,upColor,downColor,eventColor,eventDates,legend}:{data:MarketChart;compact:boolean;className?:string;upColor:string;downColor:string;eventColor:string;eventDates?:string[];legend:string}){
  const bars=downsample(data.points.filter(p=>Number.isFinite(p.price)),compact?48:96);
  const marks=compact?[]:chartEventMarks(bars,eventDates);
  const highs=bars.map(p=>p.high??p.price),lows=bars.map(p=>p.low??p.price);
  const min=Math.min(...lows),max=Math.max(...highs);
  const pad=(max-min)*0.06||1;
  const top=max+pad,bottom=min-pad,span=top-bottom||1;
  const W=640,H=compact?140:280,gap=Math.max(1.2,W/bars.length*0.22);
  const bw=Math.max(1.6,W/bars.length-gap);
  const y=(v:number)=>((top-v)/span)*H;
  if(bars.length<1)return <div className={compact?'mini-chart-empty':'chart-empty'}>Not enough trading data to draw this chart.</div>;
  return <svg className={'candle-svg '+(className||'')} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${data.symbol} candlestick chart`}>
    {marks.map(mark=>{
      const i=bars.findIndex(bar=>bar.time===mark.time);
      if(i<0)return null;
      const cx=(i+0.5)*(W/bars.length);
      return <g key={mark.time}>
        <line x1={cx} x2={cx} y1={0} y2={H} stroke={eventColor} strokeWidth={1.4}/>
        <text x={cx+4} y={11} fill={eventColor} fontSize="9" fontWeight="700">{legend} {markLabel(mark.date)}</text>
      </g>;
    })}
    {bars.map((bar,i)=>{
      const open=bar.open??bar.price,close=bar.price,high=bar.high??Math.max(open,close),low=bar.low??Math.min(open,close);
      const cx=(i+0.5)*(W/bars.length),bodyUp=close>=open,color=bodyUp?upColor:downColor;
      const yOpen=y(open),yClose=y(close),bodyTop=Math.min(yOpen,yClose),bodyH=Math.max(1.2,Math.abs(yClose-yOpen));
      return <g key={bar.time}>
        <line x1={cx} x2={cx} y1={y(high)} y2={y(low)} stroke={color} strokeWidth={1.1}/>
        <rect x={cx-bw/2} y={bodyTop} width={bw} height={bodyH} fill={color}/>
      </g>;
    })}
  </svg>;
}

export function PriceChart({data,compact=false,className,style='line',eventDates}:{data:MarketChart;compact?:boolean;className?:string;style?:ChartStyle;eventDates?:string[]}){
  const id=useId().replace(/[^a-zA-Z0-9]/g,'');
  const t=useT();
  const palette=useChartPalette();
  const period=chartPeriodStats(data);
  const up=period.up;
  const color=up?palette.up:palette.down;
  const earnLabel=t('Earnings date');
  const marks=useMemo(()=>compact?[]:chartEventMarks(data.points,eventDates),[compact,data.points,eventDates]);
  const label=(value:number)=>new Date(value).toLocaleString(undefined,{timeZone:data.timezone,...(data.range==='1d'?{hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric',...(data.range==='5y'||data.range==='max'?{year:'2-digit'}:{})})});
  if(data.points.length<2)return <div className={compact?'mini-chart-empty':'chart-empty'}>Not enough trading data to draw this chart.</div>;
  const last=period.last??data.points.at(-1)!.price;const percent=period.changePercent;const base=period.base;
  const chartClass=(compact?'mini-price-chart':'detail-price-chart')+(className?' '+className:'');
  const body=style==='candle'
    ?<CandleChart data={data} compact={compact} className={chartClass} upColor={palette.up} downColor={palette.down} eventColor={palette.earn} eventDates={eventDates} legend={earnLabel}/>
    :<ChartContainer config={{price:{label:'Price',color}}} className={chartClass} aria-label={`${data.symbol} price chart, ${data.sessionDate||data.range}, ${data.currency}`}><AreaChart accessibilityLayer data={data.points} margin={{top:marks.length?20:8,right:compact?0:4,bottom:0,left:4}}><defs><linearGradient id={'price-fill-'+id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.23}/><stop offset="100%" stopColor={color} stopOpacity={.015}/></linearGradient></defs>{!compact&&<CartesianGrid vertical={false} stroke={palette.grid}/>}<XAxis hide={compact} dataKey="time" tickFormatter={label} minTickGap={36} tickLine={false} axisLine={false} tickMargin={8}/><YAxis hide={compact} orientation="right" domain={['auto','auto']} tickFormatter={v=>Number(v).toFixed(data.quote.price<1?4:0)} width={44} tickLine={false} axisLine={false}/>{data.range==='1d'&&base!==null&&base!==undefined&&!compact&&<ReferenceLine y={base} stroke={palette.ref} strokeDasharray="3 4"/>}{marks.map(mark=><ReferenceLine key={mark.time} x={mark.time} stroke={palette.earn} strokeWidth={1.4} ifOverflow="hidden" label={{value:`${earnLabel} · ${markLabel(mark.date)}`,position:'insideTopLeft',fill:palette.earn,fontSize:10,fontWeight:700}}/>)}{!compact&&<Tooltip labelFormatter={value=>label(Number(value))} formatter={value=>[price(Number(value),data.currency),'Price']} contentStyle={{background:palette.tooltipBg,border:`1px solid ${palette.tooltipBorder}`,borderRadius:9,fontSize:13,color:palette.tooltipFg}}/>}<Area type="linear" dataKey="price" stroke={color} strokeWidth={compact?1.8:2} fill={`url(#price-fill-${id})`} isAnimationActive={false} dot={false} connectNulls={false}/></AreaChart></ChartContainer>;
  return <>{!compact&&<div className={`chart-period-return ${up?'up':'down'}`} aria-live="polite"><strong>{percent===null?'—':`${percent>=0?'+':''}${percent.toFixed(2)}%`}</strong><span>{rangeLabel(data.range)} · {price(data.points[0].price,data.currency)} → {price(last,data.currency)}</span>{marks.length>0&&<span className="chart-earn-legend"><i/>{earnLabel}</span>}</div>}{body}</>;
}
