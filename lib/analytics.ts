'use client';
const KEY='watchlist:analytics-id';
const EVENTS=new Set(['visit','dashboard','stock_search','watchlist_created']);

function visitorId(){
  try{
    const saved=window.localStorage.getItem(KEY);
    if(saved&&/^[0-9a-f-]{8,64}$/i.test(saved))return saved;
    const next=crypto.randomUUID();
    window.localStorage.setItem(KEY,next);
    return next;
  }catch{
    return '';
  }
}

export function track(event:string){
  if(typeof window==='undefined'||!EVENTS.has(event))return;
  const visitor=visitorId();
  if(!visitor)return;
  void fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,visitor}),cache:'no-store',keepalive:true}).catch(()=>{});
}
