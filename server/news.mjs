import {normalizeTicker} from './quotes.mjs';
import {normalizeNews} from '../lib/daily-move.mjs';

const cache=new Map();
const pending=new Map();

export async function getStockNews(value){
  const symbol=normalizeTicker(value);
  const prior=cache.get(symbol);
  if(prior&&Date.now()-prior.at<180000)return prior.data;
  if(pending.has(symbol))return pending.get(symbol);
  const task=(async()=>{
    for(const host of ['query2.finance.yahoo.com','query1.finance.yahoo.com']){
      try{
        const endpoint=new URL(`https://${host}/v1/finance/search`);
        endpoint.searchParams.set('q',symbol);
        endpoint.searchParams.set('quotesCount','0');
        endpoint.searchParams.set('newsCount','8');
        endpoint.searchParams.set('enableFuzzyQuery','false');
        const response=await fetch(endpoint,{headers:{'User-Agent':'Mozilla/5.0',Accept:'application/json'},signal:AbortSignal.timeout(8000)});
        if(!response.ok)continue;
        const payload=await response.json();
        const data={symbol,items:normalizeNews(payload.news||[],Date.now(),72,symbol),source:'Yahoo Finance',fetchedAt:new Date().toISOString()};
        cache.set(symbol,{at:Date.now(),data});
        if(cache.size>200)cache.delete(cache.keys().next().value);
        return data;
      }catch{/* try the next Yahoo host */}
    }
    return {symbol,items:[],source:'Yahoo Finance',fetchedAt:new Date().toISOString()};
  })();
  pending.set(symbol,task);
  try{return await task;}finally{pending.delete(symbol);}
}
