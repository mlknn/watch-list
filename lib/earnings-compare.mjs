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
    if(cap&&!capMatch(row.marketCap,cap))return false;
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

function finiteOrNull(value){
  return typeof value==='number'&&Number.isFinite(value)?value:null;
}

function marketCapValue(row){
  return finiteOrNull(row?.marketCap);
}

/** Sort table rows. Surprise percent and dollar difference stay separate. Missing values sort last. */
export function sortEarningsRows(rows,sort){
  const copy=[...(rows||[])];
  const dir=sort?.dir==='asc'?1:-1;
  const key=sort?.key||'cap';
  const missing=value=>value===null||value===undefined||(typeof value==='number'&&!Number.isFinite(value));
  copy.sort((a,b)=>{
    let av=null,bv=null;
    if(key==='symbol'){av=a.symbol;bv=b.symbol;}
    else if(key==='date'){av=a.date;bv=b.date;}
    else if(key==='session'){av=a.when||'unknown';bv=b.when||'unknown';}
    else if(key==='status'){av=a.reported?1:0;bv=b.reported?1:0;}
    else if(key==='estimate'){av=parseEps(a.epsForecast);bv=parseEps(b.epsForecast);}
    else if(key==='actual'){av=parseEps(a.eps);bv=parseEps(b.eps);}
    else if(key==='surprisePct'){av=epsSurprise(a.eps,a.epsForecast).percent;bv=epsSurprise(b.eps,b.epsForecast).percent;}
    else if(key==='surpriseAbs'||key==='surprise'){av=epsSurprise(a.eps,a.epsForecast).difference;bv=epsSurprise(b.eps,b.epsForecast).difference;}
    else {av=marketCapValue(a);bv=marketCapValue(b);}
    if(typeof av==='string'||typeof bv==='string'){
      if(av==null&&bv==null)return String(a.symbol).localeCompare(String(b.symbol));
      if(av==null)return 1;
      if(bv==null)return -1;
      return String(av).localeCompare(String(bv))*dir || String(a.symbol).localeCompare(String(b.symbol));
    }
    if(missing(av)&&missing(bv))return String(a.symbol).localeCompare(String(b.symbol));
    if(missing(av))return 1;
    if(missing(bv))return -1;
    return (av-bv)*dir || String(a.symbol).localeCompare(String(b.symbol));
  });
  return copy;
}

export function csvEscape(value){
  let text=value==null||value===undefined?'':String(value);
  if(/^[=+\-@\t\r]/.test(text))text="'"+text;
  if(/[",\n\r]/.test(text))return '"'+text.replaceAll('"','""')+'"';
  return text;
}

/** Rectangular earnings CSV. Metadata is repeated in consistent columns. */
export function earningsCsv(rows,{timezone='America/New_York',source='Nasdaq',fetchedAt='',sessionLabel=when=>when}={}){
  const header=['Ticker','Company','Announcement date','Session','Status','EPS estimate','Actual EPS','Surprise difference','Surprise percent','Market cap USD','Timezone','Source','Retrieved at'];
  const lines=[header.map(csvEscape).join(',')];
  for(const row of rows||[]){
    const surprise=epsSurprise(row.eps,row.epsForecast);
    const cap=marketCapValue(row);
    lines.push([
      row.symbol,
      row.name,
      row.date,
      sessionLabel(row.when||'unknown'),
      row.reported?'Reported':'Upcoming',
      row.epsForecast||'',
      row.eps||'',
      surprise.difference===null?'':surprise.difference,
      surprise.percent===null?'':Number(surprise.percent.toFixed(4)),
      cap===null?'':cap,
      timezone,
      source,
      fetchedAt,
    ].map(csvEscape).join(','));
  }
  return lines.join('\n');
}
