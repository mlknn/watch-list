'use client';
import {useEffect,useState} from 'react';
import {T,useT} from '@/components/product/language';
import {useTheme} from '@/components/product/theme';
import world from '@/lib/world-map.json';
type CommunityData={local?:boolean;available:boolean;users:number;countries:{code:string;users:number}[]};
export function Community(){
 const [data,setData]=useState<CommunityData|null>(null);
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const response=await fetch('/api/community');
    const result=await response.json() as CommunityData;
    if(!response.ok||typeof result!=='object')throw Error();
    if(active)setData({available:!!result.available,users:Number(result.users)||0,countries:Array.isArray(result.countries)?result.countries:[],local:result.local});
   }catch{
    if(active)setData({available:false,users:0,countries:[]});
   }
  }
  void load();
  const timer=setInterval(()=>{if(!document.hidden)void load();},60000);
  return()=>{active=false;clearInterval(timer);};
 },[]);
 const t=useT();
 const {theme}=useTheme();
 const dark=theme!=='light';
 const countries=data?.countries||[];
 const ready=!!data?.available;
 return <section className="community-section">
  <div className="community-copy">
   <p className="eyebrow"><T text="CURIOSITY HAS NO BORDERS"/></p>
   <h2><T text="A world of different perspectives."/></h2>
   <p><T text="Follow US, European, Canadian, and Turkish markets with people who see them a little differently."/></p>
   <div className="community-number">
    <strong>{ready?data!.users.toLocaleString():data?'—':''}</strong>
    <span>{ready?(data!.local?t('local member accounts'):t('unique verified members')):t('Members who share a country appear on the map.')}</span>
   </div>
   <small><T text="The map shows members who have shared their country. No precise location is collected."/></small>
  </div>
  <div className="community-map">
   <svg viewBox="0 0 900 440" role="img" aria-label="Member locations by country">
    <title>Country-level member locations</title>
    {world.map((country,i)=><path key={i} d={country.path||''} fill={countries.some(c=>c.code===country.code)?(dark?'#1f4a38':'#c5d3ef'):(dark?'#15241e':'#e4eaf4')} stroke={dark?'#0b1713':'#f4f7fb'} strokeWidth="0.6"/>)}
    {world.map((country,i)=>{const members=countries.find(c=>c.code===country.code);if(!members)return null;return <circle key={i} className="community-dot" cx={country.x} cy={country.y} r={2.2} fill={dark?'#3dff8f':'#365bd8'}><title>{country.name}</title></circle>;})}
   </svg>
   {ready&&!countries.length&&<p className="map-empty"><T text="No countries shared yet."/></p>}
   <span className="map-attribution">Map: Natural Earth</span>
  </div>
 </section>;
}
