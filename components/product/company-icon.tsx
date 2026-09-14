'use client';
import {useEffect,useMemo,useState} from 'react';
import {logoSources} from '@/lib/company-logos.mjs';

export function CompanyIcon({symbol}:{symbol:string}){
  const sources=useMemo(()=>logoSources(symbol),[symbol]);
  const [index,setIndex]=useState(0);
  useEffect(()=>{setIndex(0);},[symbol]);
  const src=sources[index];
  const initials=symbol.replace(/[^A-Za-z0-9]/g,'').slice(0,3)||'?';
  return <span className="company-icon" aria-hidden="true">{src?<img src={src} alt="" width={32} height={32} loading="lazy" referrerPolicy="no-referrer" onError={()=>setIndex(i=>i+1)}/>:initials}</span>;
}
