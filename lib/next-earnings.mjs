/** Market-week helpers for the next published earnings date. Dates are YYYY-MM-DD in New York. */

export function isoDay(value){
  const day=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day)?day:'';
}

export function addDays(iso,n){
  const day=isoDay(iso);
  if(!day)return '';
  const next=new Date(day+'T12:00:00Z');
  next.setUTCDate(next.getUTCDate()+n);
  return next.toISOString().slice(0,10);
}

export function mondayOnOrBefore(iso){
  const day=isoDay(iso);
  if(!day)return '';
  const utc=new Date(day+'T12:00:00Z');
  utc.setUTCDate(utc.getUTCDate()-(utc.getUTCDay()+6)%7);
  return utc.toISOString().slice(0,10);
}

export function todayInMarket(now=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}

/**
 * today | this-week | next-week | later | null
 * Warn when the report is still ahead this week, or when today is Fri/Sat/Sun
 * and the report is next week.
 */
export function nextEarningsTone(reportIso,todayIso){
  const report=isoDay(reportIso);
  const today=isoDay(todayIso);
  if(!report||!today||report<today)return null;
  if(report===today)return 'today';
  const reportMonday=mondayOnOrBefore(report);
  const todayMonday=mondayOnOrBefore(today);
  if(reportMonday===todayMonday)return 'this-week';
  const weekday=new Date(today+'T12:00:00Z').getUTCDay();
  if((weekday===5||weekday===6||weekday===0)&&reportMonday===addDays(todayMonday,7))return 'next-week';
  return 'later';
}

export function nextEarningsSoon(tone){
  return tone==='today'||tone==='this-week'||tone==='next-week';
}
