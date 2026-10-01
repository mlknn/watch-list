import {publicDataJson} from './request-timeout.mjs';
export type ChartPoint={time:number;price:number;open:number|null;high:number|null;low:number|null;volume:number|null};
export type MarketChart={symbol:string;companyName:string;currency:string;quoteType?:string;exchange:string;timezone:string;range:string;sessionDate:string|null;interval:string;points:ChartPoint[];earningsDates?:string[];quote:{price:number;previousClose:number|null;change:number|null;changePercent:number|null;quoteTime:string|null;open:number|null;dayLow:number|null;dayHigh:number|null;fiftyTwoWeekLow:number|null;fiftyTwoWeekHigh:number|null;volume:number|null};source:string;fetchedAt:string};
const pending=new Map<string,Promise<MarketChart>>();
const publicCharts=new Map<string,{at:number;data:MarketChart}>();
export function stockDataFetch(path:string){return fetch(path,{cache:'no-store',signal:AbortSignal.timeout(15000)});}
export function marketChart(symbol:string,range='1d'):Promise<MarketChart>{
 const key=symbol.toUpperCase()+':'+range;
 const saved=publicCharts.get(key);if(saved&&Date.now()-saved.at<30000)return Promise.resolve(saved.data);
 const inFlight=pending.get(key);if(inFlight)return inFlight;
 const task=(async()=>{const data=await publicDataJson(`/api/stocks/${encodeURIComponent(symbol)}?range=${range}`) as MarketChart;publicCharts.set(key,{at:Date.now(),data});if(publicCharts.size>80)publicCharts.delete(publicCharts.keys().next().value!);return data;})();
 pending.set(key,task);void task.finally(()=>pending.delete(key)).catch(()=>{});return task;
}
