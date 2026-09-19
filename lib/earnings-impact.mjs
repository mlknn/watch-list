function dayKey(time){
  return new Date(time).toISOString().slice(0,10);
}

function indexOnOrAfter(points,iso){
  for(let i=0;i<points.length;i++){
    if(dayKey(points[i].time)>=iso)return i;
  }
  return -1;
}

/** Map past earnings days onto exact chart timestamps so a vertical line can sit on a real bar. */
export function chartEventMarks(points,eventDates,maxGapDays=7,now=Date.now()){
  const series=(points||[]).filter(p=>Number.isFinite(p.time)).sort((a,b)=>a.time-b.time);
  const today=new Date(now).toISOString().slice(0,10);
  const marks=[];
  const seen=new Set();
  for(const iso of eventDates||[]){
    const day=String(iso||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>today)continue;
    const at=indexOnOrAfter(series,day);
    if(at<0)continue;
    const matched=dayKey(series[at].time);
    const gap=(Date.parse(matched+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000;
    if(gap>maxGapDays)continue;
    const time=series[at].time;
    if(seen.has(time))continue;
    seen.add(time);
    marks.push({time,date:day});
  }
  return marks;
}

export function chartEventTimes(points,eventDates,maxGapDays=7,now=Date.now()){
  return chartEventMarks(points,eventDates,maxGapDays,now).map(row=>row.time);
}

export function eventWindows(points,eventDates,radius=10){
  const series=(points||[]).filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.price)&&p.price>0).sort((a,b)=>a.time-b.time);
  const windows=[];
  for(const iso of eventDates||[]){
    const at=indexOnOrAfter(series,String(iso).slice(0,10));
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
      day:after(0)===null?0:((series[at].price/series[at-1].price)-1)*100,
      after3:after(3),
      after30:series[at+30]?((series[at+30].price/anchor)-1)*100:null,
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

export function averageImpact(windows,radius=10){
  const path=[];
  for(let offset=-radius;offset<=radius;offset++){
    path.push({offset,percent:mean((windows||[]).map(row=>row.path.find(p=>p.offset===offset)?.percent??null))});
  }
  const after30=(windows||[]).map(row=>row.after30).filter(v=>typeof v==='number');
  const best=after30.length?Math.max(...after30):null;
  const worst=after30.length?Math.min(...after30):null;
  const bestRow=(windows||[]).find(row=>row.after30===best);
  const worstRow=(windows||[]).find(row=>row.after30===worst);
  return {
    samples:windows?.length||0,
    path,
    day:mean((windows||[]).map(row=>row.day)),
    after3:mean((windows||[]).map(row=>row.after3)),
    after30:mean(after30),
    positive:after30.filter(v=>v>0).length,
    best:{percent:best,date:bestRow?.date||null},
    worst:{percent:worst,date:worstRow?.date||null},
  };
}
