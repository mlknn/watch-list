import {AppError,normalizeTicker} from './quotes.mjs';
export const CHART_RANGES={ '1d':{range:'5d',interval:'5m'},'5d':{range:'5d',interval:'15m'},'1mo':{range:'1mo',interval:'1d'},'3mo':{range:'3mo',interval:'1d'},'6mo':{range:'6mo',interval:'1d'},ytd:{range:'ytd',interval:'1d'},'1y':{range:'1y',interval:'1d'},'5y':{range:'5y',interval:'1wk'},max:{range:'max',interval:'1mo'} };
const cache=new Map(),pending=new Map();
const finite=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
export function normalizeChart(result,range){
  const meta=result.meta;if(!meta||!finite(meta.regularMarketPrice)||!meta.currency)throw new AppError('The provider returned an incomplete quote.',502);
  let timezone=meta.exchangeTimezoneName||'America/New_York';
  try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});}catch{timezone='UTC';}
  const day=time=>new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time*1000));
  const bars=result.indicators?.quote?.[0]||{};
  const all=(result.timestamp||[]).map((time,index)=>({time:time*1000,price:finite(bars.close?.[index]),open:finite(bars.open?.[index]),high:finite(bars.high?.[index]),low:finite(bars.low?.[index]),volume:finite(bars.volume?.[index])})).filter(p=>p.price!==null&&p.price>0&&Number.isFinite(p.time)).sort((a,b)=>a.time-b.time);
  const latestDay=all.length?day(all.at(-1).time/1000):null;
  const previousDayBars=all.filter(p=>day(p.time/1000)!==latestDay);
  const previousClose=finite(meta.previousClose)??previousDayBars.at(-1)?.price??null;
  const points=range==='1d'?all.filter(p=>day(p.time/1000)===latestDay):all;
  const current=meta.regularMarketPrice;
  const lastSession=all.filter(p=>day(p.time/1000)===latestDay);
  return {symbol:meta.symbol,companyName:meta.longName||meta.shortName||meta.symbol,currency:meta.currency,exchange:meta.fullExchangeName||meta.exchangeName||'',timezone,range,sessionDate:latestDay,interval:CHART_RANGES[range].interval,points,
    quote:{price:current,previousClose,change:previousClose===null?null:current-previousClose,changePercent:previousClose?((current-previousClose)/previousClose)*100:null,quoteTime:meta.regularMarketTime?new Date(meta.regularMarketTime*1000).toISOString():null,
      open:lastSession[0]?.open??null,dayLow:finite(meta.regularMarketDayLow),dayHigh:finite(meta.regularMarketDayHigh),fiftyTwoWeekLow:finite(meta.fiftyTwoWeekLow),fiftyTwoWeekHigh:finite(meta.fiftyTwoWeekHigh),volume:finite(meta.regularMarketVolume)},source:'Yahoo Finance',fetchedAt:new Date().toISOString()};
}
export async function getChart(value,range='1d'){
  const symbol=normalizeTicker(value);const options=CHART_RANGES[range];if(!options)throw new AppError('Choose a supported chart range.');
  const key=symbol+':'+range;const saved=cache.get(key);if(saved&&Date.now()-saved.at<60000)return saved.data;
  if(pending.has(key))return pending.get(key);
  const operation=(async()=>{let last;for(const host of ['query2.finance.yahoo.com','query1.finance.yahoo.com']){try{
    const response=await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${options.range}&interval=${options.interval}&includePrePost=false`,{headers:{'User-Agent':'Mozilla/5.0',Accept:'application/json'},signal:AbortSignal.timeout(8000)});
    if(response.status===404)throw new AppError(`Ticker “${symbol}” was not found.`,404);
    if(!response.ok)throw new AppError('Market data is temporarily unavailable. Please try again.',502);
    const payload=await response.json();const result=payload.chart?.result?.[0];if(!result)throw new AppError('No chart is available for this symbol.',404);
    const data=normalizeChart(result,range);cache.set(key,{at:Date.now(),data});if(cache.size>300)cache.delete(cache.keys().next().value);return data;
  }catch(e){last=e;if(e.status===404)throw e;}}
  throw last instanceof AppError?last:new AppError('Could not reach the market-data provider. Please try again.',502);})();
  pending.set(key,operation);try{return await operation;}finally{pending.delete(key);}
}
