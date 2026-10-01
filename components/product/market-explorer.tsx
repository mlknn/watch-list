'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useT} from './language';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {price} from '@/lib/watchlist';
import type {MarketChart} from '@/lib/market';
import {explorerRows,filterMarketRows} from '@/lib/market-explorer.mjs';
import {tapeBreadth,sectorAverage} from '@/lib/market-tape.mjs';
import {stockHref} from '@/lib/safe-return.mjs';
type Row={symbol:string;name?:string;chart:MarketChart|null;error:string|null;groupId?:string;groupTitle?:string};
type Group={id:string;title:string;stocks:Row[]};
const percent=(n:number|null|undefined)=>n==null?'—':`${n>0?'+':''}${n.toFixed(2)}%`;
export function MarketExplorer({groups,ready,favorites,from,onRefresh,refreshing,fetchedAt}:{groups:Group[];ready:Record<string,boolean>;favorites:string[];from:string;onRefresh:()=>void;refreshing:boolean;fetchedAt:string}){
  const t=useT();
  const [query,setQuery]=useState(''),[group,setGroup]=useState(''),[direction,setDirection]=useState('all'),[sort,setSort]=useState('change'),[favoritesOnly,setFavoritesOnly]=useState(false),[selected,setSelected]=useState<string[]>([]),[limit,setLimit]=useState(12);
  const all=explorerRows(groups) as Row[];
  const breadth=tapeBreadth(all);
  const filtered=filterMarketRows(all,{query,group,direction,sort,favoritesOnly,favorites}) as Row[];
  const compared=selected.map(symbol=>all.find(row=>row.symbol===symbol)).filter((row):row is Row=>!!row);
  function reset(){setQuery('');setGroup('');setDirection('all');setFavoritesOnly(false);setSort('change');setLimit(12);}
  const loaded=groups.filter(item=>ready[item.id]).length;
  return <section className="market-explorer" aria-label={t('Market explorer')}>
    <header className="explorer-heading"><div><p className="eyebrow">{t('YOUR MARKET SNAPSHOT')}</p><h2>{t('Find your next stock to research')}</h2><p>{t('Explore the displayed selection. Quotes may be delayed.')}</p></div><div><Button variant="outline" disabled={refreshing} onClick={onRefresh}>{refreshing?t('Refreshing…'):t('Refresh market')}</Button><small>{loaded}/{groups.length} {t('groups loaded')}{fetchedAt?' · '+new Date(fetchedAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}):''}</small></div></header>
    <div className="explorer-breadth" aria-label={t('Market breadth')}>
      <div><span>{t('Quoted stocks')}</span><strong>{breadth.quoted}</strong></div><div className="up"><span>{t('Advancing')}</span><strong>{breadth.up}</strong></div><div className="down"><span>{t('Declining')}</span><strong>{breadth.down}</strong></div><div><span>{t('Unchanged')}</span><strong>{breadth.flat}</strong></div>
    </div>
    <p className="explorer-scope">{t('Counts and sector averages cover this selection, not the whole market.')}</p>
    <fieldset className="explorer-sectors" aria-label={t('Filter by sector')}>
      {groups.map(item=>{const avg=ready[item.id]?sectorAverage(item.stocks):null;return <button type="button" key={item.id} aria-pressed={group===item.id} className={avg==null?'':avg>=0?'is-up':'is-down'} onClick={()=>{setGroup(group===item.id?'':item.id);setLimit(12);}}><span>{t(item.title)}</span><strong>{percent(avg)}</strong><small>{item.stocks.filter(row=>row.chart).length}/{item.stocks.length} {t('quoted names')}</small></button>;})}
    </fieldset>
    <div className="explorer-filters">
      <label>{t('Filter companies')}<Input value={query} onChange={event=>{setQuery(event.target.value);setLimit(12);}} placeholder={t('Company or ticker')} type="search"/></label>
      <label>{t('Daily move')}<select value={direction} onChange={event=>{setDirection(event.target.value);setLimit(12);}}><option value="all">{t('All moves')}</option><option value="up">{t('Gainers')}</option><option value="down">{t('Losers')}</option><option value="flat">{t('Unchanged')}</option></select></label>
      <label>{t('Sort by')}<select value={sort} onChange={event=>setSort(event.target.value)}><option value="change">{t('Biggest gainers')}</option><option value="losers">{t('Biggest losers')}</option><option value="volume">{t('Volume')}</option><option value="name">{t('Company')}</option></select></label>
      <label className="explorer-check"><input type="checkbox" checked={favoritesOnly} onChange={event=>setFavoritesOnly(event.target.checked)}/>{t('Favorites only')}</label>
      <Button variant="ghost" onClick={reset}>{t('Reset filters')}</Button>
    </div>
    <div className="explorer-results-head"><output>{filtered.length} {t('matching stocks')}</output><span>{t('Select up to 3 stocks to compare')}</span></div>
    {compared.length>0&&<section className="explorer-comparison" aria-label={t('Stock comparison')}><header><h3>{t('Stock comparison')}</h3><Button variant="ghost" onClick={()=>setSelected([])}>{t('Clear comparison')}</Button></header><div>{compared.map(row=><article key={row.symbol}><header><Link href={stockHref(row.symbol,from)}>{row.symbol}</Link><button type="button" aria-label={t('Remove from comparison')+' '+row.symbol} onClick={()=>setSelected(items=>items.filter(symbol=>symbol!==row.symbol))}>×</button></header><p>{row.chart?.companyName||row.name}</p><dl><dt>{t('Price')}</dt><dd>{row.chart?price(row.chart.quote.price,row.chart.currency):'—'}</dd><dt>{t('Today')}</dt><dd>{percent(row.chart?.quote.changePercent)}</dd><dt>{t('Volume')}</dt><dd>{row.chart?.quote.volume?.toLocaleString()??'—'}</dd><dt>{t('52-week range')}</dt><dd>{row.chart?.quote.fiftyTwoWeekLow!=null&&row.chart.quote.fiftyTwoWeekHigh!=null?`${price(row.chart.quote.fiftyTwoWeekLow,row.chart.currency)} – ${price(row.chart.quote.fiftyTwoWeekHigh,row.chart.currency)}`:'—'}</dd></dl></article>)}</div><p>{t('Prices use each stock’s quote currency. Daily percentages compare relative moves.')}</p></section>}
    <div className="explorer-results">{filtered.slice(0,limit).map(row=>{const on=selected.includes(row.symbol);return <article key={row.symbol}><label className="explorer-compare-check"><input type="checkbox" aria-label={t('Compare')+' '+row.symbol} checked={on} disabled={!on&&selected.length>=3} onChange={()=>setSelected(items=>on?items.filter(symbol=>symbol!==row.symbol):items.length<3?[...items,row.symbol]:items)}/><span className="sr-only">{t('Compare')}</span></label><Link href={stockHref(row.symbol,from)}><strong>{row.symbol}</strong><span>{row.chart?.companyName||row.name||row.symbol}</span><small>{t(row.groupTitle||'')}</small></Link><div><strong>{row.chart?price(row.chart.quote.price,row.chart.currency):'—'}</strong><span className={(row.chart?.quote.changePercent??0)>=0?'up':'down'}>{percent(row.chart?.quote.changePercent)}</span>{row.chart&&row.error&&<small>{t('Previous quote')}</small>}{!row.chart&&<small>{ready[row.groupId||'']?t('Quote unavailable'):t('Loading…')}</small>}</div></article>;})}</div>
    {!filtered.length&&<p className="explorer-empty">{favoritesOnly&&!favorites.length?t('No favorites saved yet. Star a company below to keep it here.'):t('No stocks match these filters. Try resetting them.')}</p>}
    {filtered.length>limit&&<Button variant="outline" className="explorer-more" onClick={()=>setLimit(n=>n+12)}>{t('Show more stocks')}</Button>}
  </section>;
}
