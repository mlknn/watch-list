export function nyseSession(now=new Date()){
  const tz='America/New_York';
  const weekday=new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'short'}).format(now);
  const clock=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
  const [h,m]=clock.split(':').map(Number);
  const mins=h*60+(m||0);
  if(weekday==='Sat'||weekday==='Sun')return {code:'closed',label:'Closed',detail:'Opens Monday 9:30 AM ET'};
  if(mins>=570&&mins<960){
    const left=960-mins;
    return {code:'open',label:'Open',detail:`Closes in ${Math.floor(left/60)}h ${String(left%60).padStart(2,'0')}m · NYSE`};
  }
  if(mins>=240&&mins<570)return {code:'pre',label:'Pre-market',detail:'Regular session opens 9:30 AM ET'};
  if(mins>=960&&mins<1200)return {code:'after',label:'After hours',detail:'Regular session ended 4:00 PM ET'};
  return {code:'closed',label:'Closed',detail:'Regular hours 9:30 AM – 4:00 PM ET'};
}

export function uniqueQuoted(rows){
  const map=new Map();
  for(const row of rows||[]){
    if(typeof row?.chart?.quote?.changePercent==='number')map.set(row.symbol,row);
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
  const unique=uniqueQuoted(rows).sort((a,b)=>b.chart.quote.changePercent-a.chart.quote.changePercent);
  return {gainers:unique.slice(0,count),losers:[...unique].reverse().slice(0,count)};
}

export function sectorAverage(rows){
  const pcts=(rows||[]).map(row=>row.chart?.quote?.changePercent).filter(n=>typeof n==='number');
  if(!pcts.length)return null;
  return pcts.reduce((a,b)=>a+b,0)/pcts.length;
}
