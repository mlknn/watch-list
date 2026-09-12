import {json} from '@/server/http.mjs';
import {getTickerSuggestions,rankStockSuggestions} from '@/lib/stock-search.mjs';
import {tickerFitsCurrency} from '@/lib/portfolio-currency.mjs';
const cache=new Map<string,{at:number;items:{symbol:string;name:string}[]}>();
export async function GET(request:Request){
 const url=new URL(request.url),query=(url.searchParams.get('q')||'').trim(),limit=Math.min(12,Math.max(1,Number(url.searchParams.get('limit'))||8)),currency=(url.searchParams.get('currency')||'').toUpperCase()||undefined;
 if(!query)return json([]);if(query.length>80)return json({error:'Keep searches under 80 characters.'},400);
 const local=getTickerSuggestions(query,12,currency),key=query.toLowerCase()+'|'+(currency||''),saved=cache.get(key);
 if(saved&&Date.now()-saved.at<300000)return json(rankStockSuggestions(query,[...local,...saved.items].filter(s=>tickerFitsCurrency(s.symbol,currency)),limit));
 try{const endpoint=new URL('https://query1.finance.yahoo.com/v1/finance/search');endpoint.searchParams.set('q',query);endpoint.searchParams.set('quotesCount','12');endpoint.searchParams.set('newsCount','0');
 const response=await fetch(endpoint,{headers:{'User-Agent':'Mozilla/5.0',Accept:'application/json'},signal:AbortSignal.timeout(2500)});
 if(!response.ok)return json(local.slice(0,limit));const data=await response.json() as {quotes?:{symbol?:string;longname?:string;shortname?:string;quoteType?:string}[]};
 const items=(data.quotes||[]).filter(s=>['EQUITY','ETF'].includes(s.quoteType||'')&&typeof s.symbol==='string'&&/^[A-Z0-9^][A-Z0-9.^=-]{0,24}$/.test(s.symbol)&&tickerFitsCurrency(s.symbol,currency)).map(s=>({symbol:s.symbol!,name:s.longname||s.shortname||s.symbol!}));
 cache.set(key,{at:Date.now(),items});if(cache.size>200)cache.delete(cache.keys().next().value!);
 return json(rankStockSuggestions(query,[...local,...items],limit));
 }catch{return json(local.slice(0,limit));}
}
