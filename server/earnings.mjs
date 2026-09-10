import YahooFinance from 'yahoo-finance2';
import {normalizeTicker,AppError} from './quotes.mjs';
import {requireUser,dbResult,planFor,rate} from './cloud.mjs';
import {getFundamentals} from './fundamentals.mjs';
const yahoo=new YahooFinance({suppressNotices:['yahooSurvey'],logger:{debug(){},info(){},warn(){},error(){},dir(){},log(){}}});
const cache=new Map(),pending=new Map();
const finite=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
export function normalizeEarnings(rows,now=Date.now()){
 const quarters=new Map();
 for(const row of rows||[]){const date=new Date(row.date);if(!Number.isFinite(+date)||+date>now||row.periodType!=='3M')continue;const end=date.toISOString().slice(0,10);const item={periodEnd:end,revenue:finite(row.totalRevenue),netIncome:finite(row.netIncome),eps:finite(row.dilutedEPS)};if(Object.values(item).slice(1).every(v=>v===null))continue;const prior=quarters.get(end);quarters.set(end,prior?{periodEnd:end,revenue:item.revenue??prior.revenue,netIncome:item.netIncome??prior.netIncome,eps:item.eps??prior.eps}:item);}
 return [...quarters.values()].sort((a,b)=>b.periodEnd.localeCompare(a.periodEnd)).slice(0,6).reverse();
}
async function fetchEarnings(symbol){const saved=cache.get(symbol);if(saved&&Date.now()-saved.at<3600000)return saved.data;if(pending.has(symbol))return pending.get(symbol);
 const task=(async()=>{const start=new Date();start.setUTCFullYear(start.getUTCFullYear()-3);try{const [rows,fund]=await Promise.all([yahoo.fundamentalsTimeSeries(symbol,{period1:start,type:'quarterly',module:'financials'},{fetchOptions:{signal:AbortSignal.timeout(12000)}}),getFundamentals(symbol)]);const data={symbol,quarters:normalizeEarnings(rows),currency:fund.financialCurrency||null,fetchedAt:new Date().toISOString(),source:'Yahoo Finance'};cache.set(symbol,{at:Date.now(),data});if(cache.size>200)cache.delete(cache.keys().next().value);return data;}catch{throw new AppError('Quarterly earnings are temporarily unavailable. Please try again.',502);}})();pending.set(symbol,task);try{return await task;}finally{pending.delete(symbol);}
}
export async function earningsForRequest(request,value,{authenticate=requireUser,load=fetchEarnings}={}){
 const {db,user}=await authenticate(request);const profile=dbResult(await db.from('wl_profiles').select('*').eq('id',user.id).single());if(!profile||planFor(profile).id!=='pro')throw new AppError('Earnings reports are included with Pro.',403);const symbol=normalizeTicker(value);await rate(db,'earnings:'+user.id,30,60);return load(symbol);
}
