import examples from './showcase-stocks.json';
import {apiFetch} from './auth-client';
export type ChartPoint={time:number;price:number;open:number|null;high:number|null;low:number|null;volume:number|null};
export type MarketChart={symbol:string;companyName:string;currency:string;exchange:string;timezone:string;range:string;sessionDate:string|null;interval:string;points:ChartPoint[];quote:{price:number;previousClose:number|null;change:number|null;changePercent:number|null;quoteTime:string|null;open:number|null;dayLow:number|null;dayHigh:number|null;fiftyTwoWeekLow:number|null;fiftyTwoWeekHigh:number|null;volume:number|null};source:string;fetchedAt:string};
const pending=new Map<string,Promise<MarketChart>>();
const publicCharts=new Map<string,{at:number;data:MarketChart}>();
export function stockDataFetch(symbol:string,path:string){return examples.some(s=>s.symbol===symbol.toUpperCase())?fetch(path,{cache:'no-store'}):apiFetch(path,{},false);}
export function marketChart(symbol:string,range='1d'):Promise<MarketChart>{
 const key=symbol.toUpperCase()+':'+range;
 const saved=publicCharts.get(key);if(saved&&Date.now()-saved.at<30000)return Promise.resolve(saved.data);
 const inFlight=pending.get(key);if(inFlight)return inFlight;
 const task=(async()=>{const response=await stockDataFetch(symbol,`/api/stocks/${encodeURIComponent(symbol)}?range=${range}`);const data=await response.json() as MarketChart&{error?:string};if(!response.ok)throw new Error(data.error||'Chart unavailable.');if(examples.some(s=>s.symbol===symbol.toUpperCase())){publicCharts.set(key,{at:Date.now(),data});if(publicCharts.size>40)publicCharts.delete(publicCharts.keys().next().value!);}return data;})();
 pending.set(key,task);void task.finally(()=>pending.delete(key)).catch(()=>{});return task;
}
