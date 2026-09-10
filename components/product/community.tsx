'use client';
import {useEffect,useState} from 'react';
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
 const countries=data?.countries||[];
 const ready=!!data?.available;
 return <section className="community-section">
  <div className="community-copy">
   <p className="eyebrow">CURIOSITY HAS NO BORDERS</p>
   <h2>A world of<br/>different perspectives.</h2>
   <p>Ideas travel. Follow the market with people who see it a little differently.</p>
   <div className="community-number">
    <strong>{ready?data!.users.toLocaleString():data?'—':''}</strong>
    <span>{ready?(data!.local?'local member accounts':'unique verified members'):'Members who share a country appear on the map.'}</span>
   </div>
   <small>The map shows members who have shared their country. No precise location is collected.</small>
  </div>
  <div className="community-map">
   <svg viewBox="0 0 900 440" role="img" aria-label="Member locations by country">
    <title>Country-level member locations</title>
    {world.map((country,i)=><path key={i} d={country.path||''} fill={countries.some(c=>c.code===country.code)?'#c5d3ef':'#e4eaf4'} stroke="#f4f7fb" strokeWidth="0.6"/>)}
    {world.map((country,i)=>{const members=countries.find(c=>c.code===country.code);if(!members)return null;return <circle key={i} className="community-dot" cx={country.x} cy={country.y} r={2.2} fill="#365bd8"><title>{country.name}</title></circle>;})}
   </svg>
   {ready&&!countries.length&&<p className="map-empty">No countries shared yet.</p>}
   <span className="map-attribution">Map: Natural Earth</span>
  </div>
 </section>;
}
