import catalog from '../lib/market-dashboard.json' with {type:'json'};
import {getChart} from './charts.mjs';

const publicSymbols=new Set([
  ...catalog.indices.map(item=>item.symbol),
  ...catalog.groups.flatMap(group=>group.symbols),
]);
let snapshot=null;

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

function quoteOnly(chart){
  if(!chart)return null;
  return {...chart,points:[]};
}

async function loadSymbol(symbol){
  try{return {symbol,chart:quoteOnly(await getChart(symbol,'5d')),error:null};}
  catch(e){return {symbol,chart:null,error:e.message||'Quote unavailable.'};}
}

export async function marketDashboard(){
  if(snapshot&&Date.now()-snapshot.at<60000)return snapshot.data;
  const symbols=catalog.groups.flatMap(group=>group.symbols);
  const rows=await mapLimit(symbols,8,loadSymbol);
  const bySymbol=new Map(rows.map(row=>[row.symbol,row]));
  const data={
    fetchedAt:new Date().toISOString(),
    indices:catalog.indices.map(item=>({...item,chart:null,error:null})),
    groups:catalog.groups.map(group=>({id:group.id,title:group.title,blurb:group.blurb,stocks:group.symbols.map(symbol=>bySymbol.get(symbol))})),
  };
  snapshot={at:Date.now(),data};
  return data;
}
