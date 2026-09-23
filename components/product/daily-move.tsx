'use client';
import {useEffect,useState} from 'react';
import {useT} from '@/components/product/language';
import {dailyMove} from '@/lib/daily-move.mjs';
import {stockDataFetch,type MarketChart} from '@/lib/market';

type NewsItem={title:string;publisher:string;link:string;publishedAt:string;sameDay:boolean};

function fill(text:string,vars:Record<string,string>){
  return Object.entries(vars).reduce((out,[key,value])=>out.replaceAll('{'+key+'}',value),text);
}

function lineText(t:(text:string)=>string,key:string,vars:Record<string,string>){
  const catalog:Record<string,string>={
    '{name} is up {pct}% today versus the previous close.':t('{name} is up {pct}% today versus the previous close.'),
    '{name} is down {pct}% today versus the previous close.':t('{name} is down {pct}% today versus the previous close.'),
    '{name} is little changed today versus the previous close.':t('{name} is little changed today versus the previous close.'),
    'It opened higher and is still above the open.':t('It opened higher and is still above the open.'),
    'It opened higher, then faded below the open.':t('It opened higher, then faded below the open.'),
    'It opened lower and is still below the open.':t('It opened lower and is still below the open.'),
    'It opened lower, then recovered above the open.':t('It opened lower, then recovered above the open.'),
    'It is trading above the open.':t('It is trading above the open.'),
    'It is trading below the open.':t('It is trading below the open.'),
    'It is near the session high.':t('It is near the session high.'),
    'It is near the session low.':t('It is near the session low.'),
    'Price is near the 52-week high.':t('Price is near the 52-week high.'),
    'Price is near the 52-week low.':t('Price is near the 52-week low.'),
    'Earnings are scheduled today.':t('Earnings are scheduled today.'),
  };
  return fill(catalog[key]||key,vars);
}

export function DailyMove({symbol,chart,earningsDate}:{symbol:string;chart:MarketChart|null;earningsDate?:string}){
  const t=useT();
  const [news,setNews]=useState<NewsItem[]>([]);
  useEffect(()=>{
    let alive=true;
    void stockDataFetch('/api/stocks/'+encodeURIComponent(symbol)+'/news').then(async response=>{
      const data=await response.json() as {items?:NewsItem[]};
      if(alive)setNews(Array.isArray(data.items)?data.items:[]);
    }).catch(()=>{if(alive)setNews([]);});
    return()=>{alive=false;};
  },[symbol]);
  if(!chart)return null;
  const move=dailyMove(chart,{earningsDate});
  if(!move.lines.length)return null;
  const headline=news[0];
  return <section className={'daily-move is-'+move.direction} aria-live="polite">
    <p className="eyebrow">{t("TODAY'S MOVE")}</p>
    {move.lines.map(line=><p key={line.key}>{lineText(t,line.key,line.vars)}</p>)}
    {headline&&<>
      <p>{headline.sameDay?t('Related news from the same session:'):t('Related news:')}</p>
      <a className="daily-move-headline" href={headline.link} target="_blank" rel="noopener noreferrer">{headline.title}</a>
      <small>{headline.publisher}</small>
    </>}
    <p className="daily-move-note">{headline?t('Headlines are not a confirmed reason for the move. Not advice.'):t('Read from the regular-session quote. Not advice.')} <a href={'https://finance.yahoo.com/quote/'+encodeURIComponent(symbol)+'/news/'} target="_blank" rel="noopener noreferrer">{t('More headlines on Yahoo Finance ↗')}</a></p>
  </section>;
}
