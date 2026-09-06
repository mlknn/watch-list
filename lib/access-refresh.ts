'use client';
import {useEffect,useState} from 'react';
import {authClient,config} from './auth-client';
/** Invalidate protected UI before rechecking credentials, including restored tabs. */
export function useAccessRefresh(pollMs=30000){
 const [epoch,setEpoch]=useState(0);
 useEffect(()=>{let alive=true;let unsubscribe:(()=>void)|undefined;const invalidate=()=>{if(alive)setEpoch(v=>v+1);};const storage=(e:StorageEvent)=>{if(e.key==='watchlist:auth-change')invalidate();};
 window.addEventListener('watchlist:auth-change',invalidate);window.addEventListener('storage',storage);window.addEventListener('focus',invalidate);window.addEventListener('pageshow',invalidate);window.addEventListener('pagehide',invalidate);document.addEventListener('visibilitychange',invalidate);
 const timer=pollMs>0?setInterval(()=>{if(!document.hidden)invalidate();},pollMs):undefined;
 void config().then(async c=>{if(c.localMode||!alive)return;const client=await authClient();if(!alive)return;const {data}=client.auth.onAuthStateChange(()=>invalidate());unsubscribe=()=>data.subscription.unsubscribe();}).catch(invalidate);
 return()=>{alive=false;clearInterval(timer);unsubscribe?.();window.removeEventListener('watchlist:auth-change',invalidate);window.removeEventListener('storage',storage);window.removeEventListener('focus',invalidate);window.removeEventListener('pageshow',invalidate);window.removeEventListener('pagehide',invalidate);document.removeEventListener('visibilitychange',invalidate);};
 },[pollMs]);return epoch;
}
