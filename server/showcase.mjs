import {getQuote,AppError} from './quotes.mjs';
export const SHOWCASE_START='2021-09-03';
const examples=[{symbol:'NVDA',name:'Nvidia'},{symbol:'UNH',name:'UnitedHealth Group'},{symbol:'NKE',name:'Nike'},{symbol:'WMT',name:'Walmart'},{symbol:'MA',name:'Mastercard'},{symbol:'HD',name:'Home Depot'},{symbol:'TSLA',name:'Tesla'},{symbol:'AAPL',name:'Apple'},{symbol:'MSFT',name:'Microsoft'},{symbol:'AMZN',name:'Amazon'}];
const histories=new Map();let cached,pending;
async function history(symbol){const old=histories.get(symbol);if(old&&Date.now()-old.at<6*3600000)return old.data;
 const start=Date.parse(SHOWCASE_START+'T00:00:00Z')/1000;
 for(const host of ['query2.finance.yahoo.com','query1.finance.yahoo.com'])try{
  const response=await fetch(`https://${host}/v8/finance/chart/${symbol}?period1=${start}&period2=${Math.floor(Date.now()/1000)}&interval=1d`,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();
  const r=(await response.json()).chart?.result?.[0],closes=r?.indicators?.quote?.[0]?.close;
  const data=(r?.timestamp||[]).map((t,i)=>({date:new Date(t*1000).toISOString().slice(0,10),price:closes?.[i]})).filter(p=>Number.isFinite(p.price)&&p.price>0);
  if(r?.meta.currency!=='USD'||data[0]?.date!==SHOWCASE_START)throw Error();
  histories.set(symbol,{at:Date.now(),data});return data;
 }catch{}throw new AppError('Historical example prices are temporarily unavailable.',502);
}
export function buildShowcase(entries){
 if(!entries.length)throw new AppError('Example history is unavailable.',502);
 const investmentPerStock=1000,initialValue=investmentPerStock*entries.length;
 const stocks=entries.map(({example,bars,current})=>{
  if(bars[0]?.date!==SHOWCASE_START||!Number.isFinite(bars[0].price)||bars[0].price<=0||current.currency!=='USD'||!Number.isFinite(current.price)||current.price<=0)throw new AppError('Example prices could not be compared.',502);
  const addedPrice=bars[0].price;return {...example,date:SHOWCASE_START,companyName:current.companyName,addedPrice,currentPrice:current.price,currency:current.currency,quoteTime:current.quoteTime,changePercent:(current.price/addedPrice-1)*100};
 });
 const maps=entries.map(e=>new Map(e.bars.map(b=>[b.date,b.price])));
 const common=entries[0].bars.filter(b=>maps.every(m=>m.has(b.date)));
 const monthly=new Map();for(const b of common)monthly.set(b.date.slice(0,7),b.date);
 const dates=[...new Set([SHOWCASE_START,...monthly.values()])].sort();
 let points=dates.map(date=>{const value=stocks.reduce((sum,s,i)=>sum+investmentPerStock*maps[i].get(date)/s.addedPrice,0);return {time:Date.parse(date+'T20:00:00Z'),value,changePercent:(value/initialValue-1)*100};});
 const currentValue=stocks.reduce((sum,s)=>sum+investmentPerStock*s.currentPrice/s.addedPrice,0),quoteTime=Math.min(...stocks.map(s=>Date.parse(s.quoteTime)));
 if(!Number.isFinite(quoteTime))throw new AppError('Quote timestamps are unavailable.',502);
 points=points.filter(p=>p.time<quoteTime);points.push({time:quoteTime,value:currentValue,changePercent:(currentValue/initialValue-1)*100});
 return {stocks,source:'Yahoo Finance',performance:{startDate:SHOWCASE_START,initialValue,currentValue,changePercent:(currentValue/initialValue-1)*100,investmentPerStock,points,quoteTime:new Date(quoteTime).toISOString()},method:'Illustrative buy-and-hold basket: $1,000 invested in each stock on September 3, 2021, with fractional shares and no rebalancing. Split-adjusted prices; excludes dividends, fees and tax. Not actual member activity.'};
}
export async function showcase(){if(cached&&Date.now()-cached.at<60000)return cached.data;if(pending)return pending;
 pending=(async()=>{const entries=new Array(examples.length);let next=0;await Promise.all(Array.from({length:3},async()=>{while(next<examples.length){const i=next++,example=examples[i];const [bars,current]=await Promise.all([history(example.symbol),getQuote(example.symbol)]);entries[i]={example,bars,current};}}));const data=buildShowcase(entries);cached={at:Date.now(),data};return data;})();try{return await pending;}finally{pending=null;}
}
