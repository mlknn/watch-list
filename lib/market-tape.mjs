export function nyseSession(now=new Date()){
  return exchangeSession(now,{tz:'America/New_York',open:570,close:960,pre:240,after:1200,venue:'NYSE'});
}

export function exchangeSession(now=new Date(),spec={}){
  const tz=spec.tz||'America/New_York';
  const open=spec.open??570;
  const close=spec.close??960;
  const pre=spec.pre??open-180;
  const after=spec.after??close+240;
  const venue=spec.venue||'NYSE';
  const weekday=new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'short'}).format(now);
  const clock=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
  const [h,m]=clock.split(':').map(Number);
  const mins=h*60+(m||0);
  if(spec.alwaysOpen)return {code:'open',label:'24 hours',detail:`Trades around the clock · ${venue}`};
  if(weekday==='Sat'||weekday==='Sun')return {code:'closed',label:'Closed',detail:`Opens Monday · ${venue}`};
  if(spec.rolling)return {code:'open',label:'Regular hours',detail:`Cash sessions rolling · ${venue} · holidays not applied`};
  if(mins>=open&&mins<close){
    const left=close-mins;
    return {code:'open',label:'Regular hours',detail:`Closes in ${Math.floor(left/60)}h ${String(left%60).padStart(2,'0')}m · ${venue} · holidays not applied`};
  }
  if(mins>=pre&&mins<open)return {code:'pre',label:'Pre-market',detail:`Typical regular session opens soon · ${venue}`};
  if(mins>=close&&mins<after)return {code:'after',label:'After hours',detail:`Typical regular session ended · ${venue}`};
  return {code:'closed',label:'Closed',detail:spec.hours?`${spec.hours}`:`Regular hours · ${venue} · holidays not applied`};
}

export function uniqueQuoted(rows){
  const map=new Map();
  for(const row of rows||[]){
    if(Number.isFinite(row?.chart?.quote?.changePercent))map.set(row.symbol,row);
  }
  return [...map.values()];
}

export function tapeBreadth(rows){
  const quoted=uniqueQuoted(rows);
  let up=0,down=0,flat=0;
  for(const row of quoted){
    const pct=row.chart.quote.changePercent;
    if(pct>0.005)up++;
    else if(pct<-0.005)down++;
    else flat++;
  }
  return {quoted:quoted.length,up,down,flat,upShare:quoted.length?up/quoted.length:0};
}

export function tapeMovers(rows,count=5){
  const unique=uniqueQuoted(rows);
  const gainers=unique.filter(row=>row.chart.quote.changePercent>0).sort((a,b)=>b.chart.quote.changePercent-a.chart.quote.changePercent).slice(0,count);
  const losers=unique.filter(row=>row.chart.quote.changePercent<0).sort((a,b)=>a.chart.quote.changePercent-b.chart.quote.changePercent).slice(0,count);
  return {gainers,losers};
}

export function sectorAverage(rows){
  const pcts=(rows||[]).map(row=>row.chart?.quote?.changePercent).filter(n=>Number.isFinite(n));
  if(!pcts.length)return null;
  return pcts.reduce((a,b)=>a+b,0)/pcts.length;
}
