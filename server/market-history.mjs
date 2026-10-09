import {AppError} from './quotes.mjs';

const SCREENER='https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=250&scrIds=largest_market_cap&formatted=false&lang=en-US&region=US';
const ranges=new Set(['ytd','1y','2y','5y','10y']);
const historyCache=new Map();
let leadersCache=null,leadersPending=null;
const rankedCache=new Map(),rankedPending=new Map();
const headers={'User-Agent':'Mozilla/5.0','Accept':'application/json'};

function startDate(range,now=new Date()){
  const date=new Date(now);
  if(range==='ytd')return new Date(Date.UTC(date.getUTCFullYear(),0,1));
  date.setUTCFullYear(date.getUTCFullYear()-Number.parseInt(range,10));
  return date;
}

async function leaders(){
  if(leadersCache&&Date.now()-leadersCache.at<5*60_000)return leadersCache.rows;
  if(leadersPending)return leadersPending;
  leadersPending=(async()=>{
    let last;
    for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com'])try{
      const response=await fetch(SCREENER.replace('query1.finance.yahoo.com',host),{headers,signal:AbortSignal.timeout(12_000)});
      if(!response.ok)throw new Error('Market leaders are temporarily unavailable.');
      const payload=await response.json();
      const quotes=payload?.finance?.result?.[0]?.quotes;
      if(!Array.isArray(quotes)||!quotes.length)throw new Error('Market leaders are temporarily unavailable.');
      const rows=quotes.filter(row=>row?.symbol&&Number.isFinite(row.marketCap)&&row.marketCap>0)
        .map(row=>({symbol:String(row.symbol).toUpperCase(),name:row.longName||row.shortName||row.symbol,marketCap:row.marketCap,price:Number.isFinite(row.regularMarketPrice)?row.regularMarketPrice:null,currency:row.currency||'USD'}))
        .sort((a,b)=>b.marketCap-a.marketCap).slice(0,250);
      if(rows.length<50)throw new Error('The market leaders list is incomplete.');
      leadersCache={at:Date.now(),rows};return rows;
    }catch(error){last=error;}
    throw new AppError(last?.message||'Market leaders are temporarily unavailable.',502);
  })();
  try{return await leadersPending;}finally{leadersPending=null;}
}

async function baseline(symbol,range,date){
  const key=`${symbol}:${range}:${date.toISOString().slice(0,10)}`;
  const cached=historyCache.get(key);if(cached&&Date.now()-cached.at<12*60*60_000)return cached.price;
  const from=Math.floor(date.getTime()/1000)-7*86400,to=Math.floor(date.getTime()/1000)+14*86400;
  let last;
  for(const host of ['query2.finance.yahoo.com','query1.finance.yahoo.com'])try{
    const url=`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${from}&period2=${to}&interval=1d&events=div`;
    const response=await fetch(url,{headers,signal:AbortSignal.timeout(10_000)});
    if(response.status===404){const error=new Error('No trading history at the selected date.');error.code='not-listed';throw error;}
    if(!response.ok)throw new Error('Historical prices are temporarily unavailable.');
    const payload=await response.json(),result=payload?.chart?.result?.[0];
    if(!result&&payload?.chart?.error){const error=new Error('No trading history at the selected date.');error.code='not-listed';throw error;}
    const times=result?.timestamp||[],close=result?.indicators?.quote?.[0]?.close||[];
    const bars=times.map((time,index)=>({time,price:close[index]})).filter(row=>Number.isFinite(row.price)&&row.price>0);
    const target=Math.floor(date.getTime()/1000);
    const bar=bars.find(row=>row.time>=target)||bars.at(-1);
    if(!bar){const error=new Error('No trading history at the selected date.');error.code='not-listed';throw error;}
    historyCache.set(key,{at:Date.now(),price:bar.price});if(historyCache.size>2000)historyCache.delete(historyCache.keys().next().value);
    return bar.price;
  }catch(error){last=error;}
  throw last||new Error('Historical price is unavailable.');
}

export async function marketHistory(range='ytd',offset=0,now=new Date()){
  if(!ranges.has(range))throw new AppError('Choose YTD, 1 year, 2 years, 5 years, or 10 years.');
  if(!Number.isInteger(offset)||offset<0||offset>80||offset%20!==0)throw new AppError('Choose a valid page of market history.');
  const all=(await leaders()).slice(0,100),companies=all.slice(offset,offset+20),date=startDate(range,now);let next=0;
  const rows=await Promise.all(Array.from({length:6},async()=>{
    const output=[];
    while(next<companies.length){
      const item=companies[next++];
      try{
        const startPrice=await baseline(item.symbol,range,date);
        const changePercent=item.price===null?null:(item.price/startPrice-1)*100;
        const historicalMarketCap=item.price===null?null:item.marketCap*startPrice/item.price;
        output.push({...item,historicalMarketCap,changePercent,historyStatus:item.price===null?'unavailable':'available'});
      }catch(error){const historyStatus=error?.code==='not-listed'?'not-listed':'unavailable';output.push({...item,historicalMarketCap:null,changePercent:null,historyStatus});}
    }
    return output;
  }));
  const ordered=rows.flat().sort((a,b)=>b.marketCap-a.marketCap);
  return {range,offset,nextOffset:offset+20<all.length?offset+20:null,total:Math.min(all.length,100),asOf:new Date().toISOString(),startDate:date.toISOString().slice(0,10),source:'Yahoo Finance',rows:ordered.map((row,index)=>({...row,rank:offset+index+1}))};
}

export async function historicalMarketHistory(range='ytd',offset=0,now=new Date()){
  if(!ranges.has(range))throw new AppError('Choose YTD, 1 year, 2 years, 5 years, or 10 years.');
  if(!Number.isInteger(offset)||offset<0||offset>80||offset%20!==0)throw new AppError('Choose a valid page of market history.');
  const date=startDate(range,now),key=`${range}:${date.toISOString().slice(0,10)}`;
  let rows=rankedCache.get(key);
  if(!rows||Date.now()-rows.at>6*60*60_000){
    let pending=rankedPending.get(key);
    if(!pending){
      pending=(async()=>{
        const candidates=await leaders();let cursor=0;const priced=[];
        await Promise.all(Array.from({length:20},async()=>{
          while(cursor<candidates.length){
            const item=candidates[cursor++];
            try{
              const startPrice=await baseline(item.symbol,range,date);
              if(item.price===null)continue;
              const historicalMarketCap=item.marketCap*startPrice/item.price;
              priced.push({...item,historicalMarketCap,changePercent:(item.price/startPrice-1)*100,historyStatus:'available'});
            }catch(error){if(error?.code!=='not-listed')throw error;}
          }
        }));
        const ranked=priced.sort((a,b)=>b.historicalMarketCap-a.historicalMarketCap).slice(0,100).map((row,index)=>({...row,rank:index+1}));
        if(ranked.length<100)throw new AppError('Historical market leaders are temporarily incomplete. Please retry.',502);
        rankedCache.set(key,{at:Date.now(),rows:ranked});return ranked;
      })();
      rankedPending.set(key,pending);
    }
    try{rows=await pending;}finally{rankedPending.delete(key);}
  }else rows=rows.rows;
  return {range,offset,nextOffset:offset+20<rows.length?offset+20:null,total:rows.length,asOf:new Date().toISOString(),startDate:date.toISOString().slice(0,10),source:'Yahoo Finance; estimated using current shares outstanding',rows:rows.slice(offset,offset+20)};
}
