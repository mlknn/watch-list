/** Compare Nasdaq EPS strings without inventing missing values. In-line = |surprise %| < 1. */

export function parseEps(value){
  const raw=String(value??'').trim();
  if(!raw||!/\d/.test(raw))return null;
  const negative=/^\(.*\)$/.test(raw)||/-/.test(raw.replace(/[A-Z]/gi,''));
  const n=Number(raw.replace(/[^0-9.]/g,''));
  if(!Number.isFinite(n))return null;
  if(n===0)return 0;
  return negative?-n:n;
}

export function epsSurprise(actual,estimate){
  const a=parseEps(actual);
  const e=parseEps(estimate);
  if(a===null||e===null)return {difference:null,percent:null,tone:'neutral'};
  const difference=a-e;
  const percent=e===0?null:(difference/Math.abs(e))*100;
  let tone='neutral';
  if(percent===null)tone=difference===0?'inline':difference>0?'above':'below';
  else if(Math.abs(percent)<1)tone='inline';
  else tone=percent>0?'above':'below';
  return {difference,percent,tone};
}

export function formatEps(value){
  const n=typeof value==='number'?value:parseEps(value);
  if(n===null)return '';
  const sign=n<0?'-':'';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function formatSurprise(result){
  if(!result||result.difference===null)return '';
  const signed=result.difference>0?'+':result.difference<0?'−':'';
  const abs=formatEps(Math.abs(result.difference));
  if(result.percent===null)return `${signed}${abs}`;
  const pct=`${result.percent>0?'+':result.percent<0?'−':''}${Math.abs(result.percent).toFixed(1)}%`;
  return `${signed}${abs} (${pct})`;
}

export function capBucket(marketCap){
  const b=Number(marketCap)/1e9;
  if(!Number.isFinite(b)||b<=0)return '';
  if(b<10)return '1-10';
  if(b<50)return '10-50';
  if(b<200)return '50-200';
  return '200+';
}

export function capMatch(marketCap,filter){
  if(!filter)return true;
  return capBucket(marketCap)===filter;
}

export function formatCap(marketCap){
  const n=Number(marketCap);
  if(!Number.isFinite(n)||n<=0)return '';
  if(n>=1e12)return `$${(n/1e12).toFixed(1)}T`;
  if(n>=1e9)return `$${(n/1e9).toFixed(1)}B`;
  return `$${Math.round(n/1e6)}M`;
}

export function weekRangeLabel(start,end){
  const a=new Date(String(start).slice(0,10)+'T12:00:00Z');
  const b=new Date(String(end).slice(0,10)+'T12:00:00Z');
  if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime()))return '';
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const sameMonth=a.getUTCMonth()===b.getUTCMonth()&&a.getUTCFullYear()===b.getUTCFullYear();
  if(sameMonth)return `${months[a.getUTCMonth()]} ${a.getUTCDate()}–${b.getUTCDate()}, ${a.getUTCFullYear()}`;
  if(a.getUTCFullYear()===b.getUTCFullYear())return `${months[a.getUTCMonth()]} ${a.getUTCDate()}–${months[b.getUTCMonth()]} ${b.getUTCDate()}, ${a.getUTCFullYear()}`;
  return `${months[a.getUTCMonth()]} ${a.getUTCDate()}, ${a.getUTCFullYear()}–${months[b.getUTCMonth()]} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
}

export function matchesQuery(row,query){
  const q=String(query||'').trim().toLowerCase();
  if(!q)return true;
  return row.symbol.toLowerCase().includes(q)||String(row.name||'').toLowerCase().includes(q);
}

export function filterEarningsRows(rows,query,session,status,watchOnly,watchSymbols,cap){
  const watch=watchSymbols instanceof Set?watchSymbols:new Set(watchSymbols||[]);
  return (rows||[]).filter(row=>{
    if(!matchesQuery(row,query))return false;
    if(session&&row.when!==session)return false;
    if(status==='upcoming'&&row.reported)return false;
    if(status==='reported'&&!row.reported)return false;
    if(watchOnly&&!watch.has(row.symbol))return false;
    if(cap&&!capMatch(row.marketCap||0,cap))return false;
    return true;
  });
}

export function summaryCounts(rows,today,weekStart,weekEnd,watchSymbols){
  const watch=watchSymbols instanceof Set?watchSymbols:new Set(watchSymbols||[]);
  const weekHasToday=!!today&&!!weekStart&&!!weekEnd&&today>=weekStart&&today<=weekEnd;
  return {
    week:rows.length,
    today:weekHasToday?rows.filter(row=>row.date===today).length:0,
    reported:rows.filter(row=>row.reported).length,
    watch:rows.filter(row=>watch.has(row.symbol)).length,
  };
}
