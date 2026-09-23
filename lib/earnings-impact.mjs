const NY='America/New_York';
const dayFmt=new Intl.DateTimeFormat('en-CA',{timeZone:NY,year:'numeric',month:'2-digit',day:'2-digit'});

function dayKey(time){
  const date=new Date(time);
  return Number.isFinite(date.getTime())?dayFmt.format(date):'';
}

function eventDay(value){
  if(value&&typeof value==='object')return String(value.date||'').slice(0,10);
  return String(value||'').slice(0,10);
}

function eventWhen(value){
  if(value&&typeof value==='object')return value.when||'unknown';
  return 'unknown';
}

function indexOnOrAfter(points,iso){
  for(let i=0;i<points.length;i++){
    if(dayKey(points[i].time)>=iso)return i;
  }
  return -1;
}

function reactionIndex(points,iso,when){
  const at=indexOnOrAfter(points,iso);
  if(at<0)return -1;
  if(when!=='amc')return at;
  const next=indexOnOrAfter(points,addCalendarDay(iso,1));
  return next<0?at:next;
}

function addCalendarDay(iso,delta){
  const date=new Date(iso+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+delta);
  return date.toISOString().slice(0,10);
}

/** Map past announcement days onto exact chart timestamps so a vertical line can sit on a real bar. */
export function chartEventMarks(points,eventDates,maxGapDays=7,now=Date.now()){
  const series=(points||[]).filter(p=>Number.isFinite(p.time)).sort((a,b)=>a.time-b.time);
  const today=dayFmt.format(new Date(now));
  const marks=[];
  const seen=new Set();
  for(const event of eventDates||[]){
    const day=eventDay(event);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>today)continue;
    const at=reactionIndex(series,day,eventWhen(event));
    if(at<0)continue;
    const matched=dayKey(series[at].time);
    const gap=(Date.parse(matched+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000;
    if(gap>maxGapDays)continue;
    const time=series[at].time;
    if(seen.has(time))continue;
    seen.add(time);
    marks.push({time,date:day,when:eventWhen(event)});
  }
  return marks;
}

export function chartEventTimes(points,eventDates,maxGapDays=7,now=Date.now()){
  return chartEventMarks(points,eventDates,maxGapDays,now).map(row=>row.time);
}

/** Build windows only from announcement dates. Quarter-ends are not accepted as a substitute. */
export function eventWindows(points,eventDates,radius=10){
  const series=(points||[]).filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.price)&&p.price>0).sort((a,b)=>a.time-b.time);
  const windows=[];
  for(const event of eventDates||[]){
    const day=eventDay(event);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
    const when=eventWhen(event);
    const at=reactionIndex(series,day,when);
    if(at<1)continue;
    const anchor=series[at].price;
    if(!(anchor>0))continue;
    const path=[];
    for(let offset=-radius;offset<=radius;offset++){
      const row=series[at+offset];
      path.push({offset,percent:row?((row.price/anchor)-1)*100:null});
    }
    const after=(n)=>{
      const row=series[at+n];
      return row&&row.price>0?((row.price/anchor)-1)*100:null;
    };
    windows.push({
      date:dayKey(series[at].time),
      announced:day,
      when,
      day:((series[at].price/series[at-1].price)-1)*100,
      after3:after(3),
      after30:after(30),
      path,
    });
  }
  return windows;
}

function mean(values){
  const rows=values.filter(v=>typeof v==='number'&&Number.isFinite(v));
  if(!rows.length)return null;
  return rows.reduce((sum,v)=>sum+v,0)/rows.length;
}

function finite(values){
  return (values||[]).filter(v=>typeof v==='number'&&Number.isFinite(v));
}

export function averageImpact(windows,radius=10){
  const path=[];
  for(let offset=-radius;offset<=radius;offset++){
    path.push({offset,percent:mean((windows||[]).map(row=>row.path.find(p=>p.offset===offset)?.percent??null))});
  }
  const after30=finite((windows||[]).map(row=>row.after30));
  const after3=finite((windows||[]).map(row=>row.after3));
  const day=finite((windows||[]).map(row=>row.day));
  const best=after30.length?Math.max(...after30):null;
  const worst=after30.length?Math.min(...after30):null;
  const bestRow=(windows||[]).find(row=>row.after30===best);
  const worstRow=(windows||[]).find(row=>row.after30===worst);
  return {
    samples:windows?.length||0,
    daySamples:day.length,
    after3Samples:after3.length,
    after30Samples:after30.length,
    path,
    day:mean(day),
    after3:mean(after3),
    after30:mean(after30),
    positive:after30.filter(v=>v>0).length,
    best:{percent:best,date:bestRow?.date||null},
    worst:{percent:worst,date:worstRow?.date||null},
  };
}
