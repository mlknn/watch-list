'use client';
import {useState} from 'react';
import {ArrowUpRight,LoaderCircle} from 'lucide-react';
import {HoverCard,HoverCardTrigger,HoverCardContent} from '@/components/ui/hover-card';
import {marketChart,type MarketChart} from '@/lib/market';
import {chartPeriodStats} from '@/lib/chart-period.mjs';
import {PriceChart} from './price-chart';
import {price} from '@/lib/watchlist';
export function StockLink({symbol,name}:{symbol:string;name:string}){
  const [open,setOpen]=useState(false),[data,setData]=useState<MarketChart|null>(null),[error,setError]=useState('');
  async function show(next:boolean){setOpen(next);if(next){setError('');try{setData(await marketChart(symbol));}catch(e){setError((e as Error).message);}}}const change=data?chartPeriodStats(data).changePercent:undefined;
  return <HoverCard open={open} onOpenChange={v=>void show(v)}><HoverCardTrigger href={'/stocks/'+encodeURIComponent(symbol)} className="stock-detail-link" onFocus={()=>void show(true)} onBlur={()=>setOpen(false)}><strong>{symbol}</strong><span className="company-name">{name}</span></HoverCardTrigger><HoverCardContent className="stock-hover-card" align="start" sideOffset={10}><div className="hover-heading"><strong>{symbol}</strong><span>Latest trading session</span></div>{data?<><div className="hover-price"><strong>{price(data.quote.price,data.currency)}</strong>{change!==null&&change!==undefined&&<span className={change>=0?'up':'down'}>{change>=0?'+':''}{change.toFixed(2)}%</span>}</div><PriceChart data={data} compact/><div className="hover-foot"><span>{data.sessionDate} · {data.timezone}</span><ArrowUpRight size={15}/></div>{error&&<p className="form-error">{error}</p>}</>:error?<p className="form-error">{error}</p>:<div className="mini-chart-empty"><LoaderCircle className="spin" size={18}/>Loading chart…</div>}<span className="hover-caption">Click for stock details · Quotes may be delayed</span></HoverCardContent></HoverCard>;
}
