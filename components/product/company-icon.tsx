'use client';
import {useState} from 'react';
import symbols from '@/lib/company-icons.json';
export function CompanyIcon({symbol}:{symbol:string}){const [failed,setFailed]=useState(false);return <span className="company-icon" aria-hidden="true">{!failed&&symbols.includes(symbol)?<img src={'/companies/'+symbol+'.png'} alt="" width={32} height={32} loading="lazy" onError={()=>setFailed(true)}/>:symbol.slice(0,3)}</span>;}
