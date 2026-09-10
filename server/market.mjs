import catalog from '../lib/market-dashboard.json' with {type:'json'};
import {getQuote,AppError} from './quotes.mjs';

const publicSymbols=new Set([
  ...catalog.indices.map(item=>item.symbol),
  ...catalog.groups.flatMap(group=>group.symbols),
]);
const quoteCache=new Map();

export function isPublicMarketSymbol(symbol){
  return publicSymbols.has(String(symbol||'').toUpperCase());
}

async function mapLimit(items,limit,fn){
  const out=new Array(items.length);
  let next=0;
  async function worker(){
    while(next<items.length){
      const index=next++;
      out[index]=await fn(items[index],index);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return out;
}

function asRow(quote){
  const previous=typeof quote.previousClose==='number'?quote.previousClose:null;
  const changePercent=typeof quote.changePercent==='number'?quote.changePercent:null;
  return {
    symbol:quote.symbol,
    chart:{
      symbol:quote.symbol,
      companyName:quote.companyName,
      currency:quote.currency,
      exchange:quote.exchange||'',
      timezone:'',
      range:'1d',
      sessionDate:null,
      interval:'1d',
      points:[],
      quote:{price:quote.price,previousClose:previous,change:previous===null?null:quote.price-previous,changePercent,quoteTime:quote.quoteTime||null,open:null,dayLow:null,dayHigh:null,fiftyTwoWeekLow:null,fiftyTwoWeekHigh:null,volume:null},
      source:quote.source||'Yahoo Finance',
      fetchedAt:quote.checkedAt||new Date().toISOString(),
    },
    error:null,
  };
}

async function loadSymbol(symbol){
  const saved=quoteCache.get(symbol);
  if(saved&&saved.row.chart&&Date.now()-saved.at<45000)return saved.row;
  let last=null;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const row=asRow(await getQuote(symbol));
      quoteCache.set(symbol,{at:Date.now(),row});
      if(quoteCache.size>200)quoteCache.delete(quoteCache.keys().next().value);
      return row;
    }catch(e){
      last=e;
      if(attempt===0)await new Promise(resolve=>setTimeout(resolve,450));
    }
  }
  return {symbol,chart:null,error:last?.message||'Quote unavailable.'};
}

export async function quotesForSymbols(symbols){
  const unique=[...new Set((symbols||[]).map(s=>String(s||'').toUpperCase()).filter(Boolean))];
  return mapLimit(unique,3,loadSymbol);
}

export async function marketGroup(id){
  const group=catalog.groups.find(item=>item.id===id);
  if(!group)throw new AppError('Unknown market group.',404);
  const stocks=await mapLimit(group.symbols,3,loadSymbol);
  return {fetchedAt:new Date().toISOString(),group:{id:group.id,title:group.title,blurb:group.blurb,stocks}};
}
