'use client';
import {useMemo,useState} from 'react';
import locals from '@/lib/company-icons.json';

function logoSources(symbol:string){
  const upper=symbol.toUpperCase();
  const dotted=upper.replace('-','.');
  const sources:string[]=[];
  if((locals as string[]).includes(upper))sources.push('/companies/'+upper+'.png');
  sources.push('https://financialmodelingprep.com/image-stock/'+encodeURIComponent(upper)+'.png');
  if(dotted!==upper)sources.push('https://financialmodelingprep.com/image-stock/'+encodeURIComponent(dotted)+'.png');
  sources.push('https://assets.parqet.com/logos/symbol/'+encodeURIComponent(upper)+'?format=png');
  return sources;
}

export function CompanyIcon({symbol}:{symbol:string}){
  const sources=useMemo(()=>logoSources(symbol),[symbol]);
  const [index,setIndex]=useState(0);
  const src=sources[index];
  const initials=symbol.replace(/[^A-Za-z0-9]/g,'').slice(0,3)||'?';
  return <span className="company-icon" aria-hidden="true">{src?<img src={src} alt="" width={32} height={32} loading="lazy" referrerPolicy="no-referrer" onError={()=>setIndex(i=>i+1)}/>:initials}</span>;
}
