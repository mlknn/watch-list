import {watchlistPerformance} from './watchlist-performance.mjs';

const FALLBACK_NAME='Shared watchlist';

export function formatShareReturn(percent){
  if(!Number.isFinite(percent))return null;
  const digits=Math.abs(percent)>=10?1:2;
  return `${percent>0?'+':''}${percent.toFixed(digits)}%`;
}

export function shareCard(list){
  const name=String(list?.name||'').replace(/\s+/g,' ').trim().slice(0,60)||FALLBACK_NAME;
  const stocks=(list?.stocks||[]).filter(stock=>typeof stock.symbol==='string'&&stock.symbol);
  const unique=[...new Set(stocks.map(stock=>stock.symbol))];
  const shown=unique.slice(0,5);
  const extra=unique.length-shown.length;
  const tickers=shown.join(' · ')+(extra>0?` · +${extra} more`:'');
  const change=watchlistPerformance(list||{stocks:[]});
  const returnLabel=formatShareReturn(change);
  const count=stocks.length;
  const countLabel=count===1?'1 stock':`${count} stocks`;
  const title=returnLabel?`${name} · ${returnLabel}`:name;
  const description=returnLabel
    ? `${name} is ${returnLabel} since tracking started.${tickers?` ${tickers}.`:''} ${count?countLabel+'. ':''}Open the live list on StockWatchlist.`
    : count
      ? `${name} · ${countLabel}.${tickers?` ${tickers}.`:''} A shared watchlist on StockWatchlist.`
      : `${name} · A shared watchlist on StockWatchlist.`;
  return {
    name,
    title,
    description,
    returnLabel,
    change:Number.isFinite(change)?change:null,
    tickers,
    count,
    countLabel,
    tone:returnLabel?(change>0?'up':change<0?'down':'flat'):'flat',
  };
}

export const emptyShareCard=()=>shareCard({name:FALLBACK_NAME,stocks:[]});
