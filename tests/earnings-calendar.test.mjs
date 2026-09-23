import test from 'node:test';
import assert from 'node:assert/strict';
import {averageImpact,chartEventMarks,chartEventTimes,eventWindows} from '../lib/earnings-impact.mjs';
import {earningsWeek,mondayOnOrBefore,normalizeDayRows,reportTiming,toYahooSymbol,weekDays,clampMonday,earningsWindow,addDays,weeksAhead,prefetchAhead,nasdaqCacheTtl,homePreviewRows,earningsHomePreview} from '../server/earnings-calendar.mjs';

test('class shares map to Yahoo tickers',()=>{
  assert.equal(toYahooSymbol('BRK.B'),'BRK-B');
  assert.equal(toYahooSymbol('aapl'),'AAPL');
  assert.equal(toYahooSymbol('../x'),'');
});

test('week starts Monday and has five weekday columns',()=>{
  assert.equal(mondayOnOrBefore('2026-09-18'),'2026-09-14');
  assert.deepEqual(weekDays('2026-09-14'),['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18']);
});

test('report times follow Nasdaq and are never guessed',()=>{
  assert.equal(reportTiming('time-pre-market'),'bmo');
  assert.equal(reportTiming('time-after-hours'),'amc');
  assert.equal(reportTiming('time-during-market-hours'),'during');
  assert.equal(reportTiming('time-not-supplied'),'unknown');
  assert.equal(reportTiming(''),'unknown');
});

test('a quarter counts as reported only when Nasdaq has a real EPS',()=>{
  const rows=normalizeDayRows([
    {symbol:'AAA',name:'Alpha',marketCap:'$9,000,000,000',time:'time-not-supplied',eps:'$0.92',epsForecast:'$0.84'},
    {symbol:'BBB',name:'Beta',marketCap:'$8,000,000,000',time:'time-pre-market',eps:'',epsForecast:'$1.10'},
  ]);
  assert.equal(rows[0].reported,true);
  assert.equal(rows[0].eps,'$0.92');
  assert.equal(rows[0].when,'unknown');
  assert.equal(rows[1].reported,false);
  assert.equal(rows[1].when,'bmo');
});

test('day rows sort by market cap and skip junk tickers',()=>{
  const rows=normalizeDayRows([
    {symbol:'ZZZ',name:'Tiny',marketCap:'$10',time:'time-amc'},
    {symbol:'AAPL',name:'Apple',marketCap:'$3,000,000,000,000',time:'time-amc'},
    {symbol:'../nope',name:'Bad',marketCap:'$9'},
    {symbol:'AAPL',name:'Dup',marketCap:'$1'},
  ]);
  assert.equal(rows[0].symbol,'AAPL');
  assert.equal(rows[0].when,'amc');
  assert.equal(rows.length,1);
});

test('busy days keep every large name instead of cutting the list',()=>{
  const rows=normalizeDayRows(Array.from({length:15},(_,i)=>({
    symbol:'T'+String(i+10),
    name:'Co '+i,
    marketCap:String(3_000_000_000+i),
    time:'time-amc',
  })));
  assert.equal(rows.length,15);
});

test('names below $1B are dropped; the rest stay sorted by market cap',()=>{
  const rows=normalizeDayRows([
    {symbol:'TINY',name:'Tiny',marketCap:'$500,000,000',time:'time-amc'},
    {symbol:'MID',name:'Mid',marketCap:'$1.2B',time:'time-not-supplied'},
    {symbol:'MSFT',name:'Microsoft',marketCap:'$3,000,000,000,000',time:'time-bmo'},
    {symbol:'EDGE',name:'Edge',marketCap:'$1,000,000,000',time:'time-pre-market'},
  ]);
  assert.deepEqual(rows.map(row=>row.symbol),['MSFT','MID','EDGE']);
  assert.equal(rows[1].when,'unknown');
  assert.equal(rows[1].marketCap,1.2e9);
  assert.equal(rows[2].when,'bmo');
});

test('one week is loaded, in weekday order, with a dated range',async()=>{
  const now=new Date('2026-09-18T16:00:00Z');
  const fetched=[];
  const data=await earningsWeek('2026-09-16',{now,loadDay:async date=>{
    fetched.push(date);
    if(date==='2026-09-16')return [{symbol:'INTC',name:'Intel',marketCap:1e11,when:''}];
    if(date==='2026-09-14')return [{symbol:'AAPL',name:'Apple',marketCap:1e12,when:'bmo'}];
    if(date==='2026-09-18')return [{symbol:'MSFT',name:'Microsoft',marketCap:1e12,when:'amc'}];
    return [];
  }});
  assert.deepEqual([...fetched].sort(),['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18']);
  assert.equal(data.weekStart,'2026-09-14');
  assert.equal(data.weekEnd,'2026-09-18');
  assert.equal(data.days.length,5);
  assert.equal(data.days[0].companies[0].when,'bmo');
  assert.equal(data.days[4].companies[0].when,'amc');
  assert.equal(data.days[2].companies[0].symbol,'INTC');
  assert.ok(data.days.every(day=>day.status==='ok'));
});

test('a day the source refuses is marked unavailable, not empty',async()=>{
  const now=new Date('2026-09-18T16:00:00Z');
  const data=await earningsWeek('2026-09-14',{now,loadDay:async date=>{
    if(date==='2026-09-15')throw new Error('Nasdaq said no');
    return [];
  }});
  assert.equal(data.days[1].status,'unavailable');
  assert.equal(data.days[0].status,'ok');
});

test('past weeks stop two quarters back; future weeks stay in the window',()=>{
  const now=new Date('2026-09-18T16:00:00Z');
  const {minWeek,maxWeek,todayMonday}=earningsWindow(now);
  assert.equal(todayMonday,'2026-09-14');
  assert.equal(minWeek,addDays(todayMonday,-26*7));
  assert.equal(clampMonday('',now),'2026-09-14');
  assert.equal(clampMonday('2026-09-23',now),'2026-09-21');
  assert.throws(()=>clampMonday('2025-01-06',now),e=>e.status===400);
  assert.throws(()=>clampMonday(addDays(maxWeek,7),now),e=>e.status===400);
});

test('this week prefetches the next four Mondays, never itself',()=>{
  const now=new Date('2026-09-18T16:00:00Z');
  const {maxWeek,todayMonday}=earningsWindow(now);
  assert.deepEqual(weeksAhead(todayMonday,4,maxWeek),['2026-09-21','2026-09-28','2026-10-05','2026-10-12']);
});

test('warming later weeks waits for this week and never fetches it again',async()=>{
  const now=new Date('2026-09-18T16:00:00Z');
  const fetched=[];
  await earningsWeek('2026-09-14',{now,loadDay:async date=>{
    fetched.push(date);
    return [];
  }});
  const afterThis=fetched.length;
  await prefetchAhead('2026-09-14',{now,count:2,loadDay:async date=>{
    fetched.push(date);
    return [];
  }});
  assert.equal(afterThis,5);
  assert.ok(fetched.slice(afterThis).every(date=>date>='2026-09-21'));
  assert.ok(fetched.includes('2026-09-21'));
  assert.ok(!fetched.slice(afterThis).includes('2026-09-14'));
});

test('earnings markers sit on the first session on or after the report day',()=>{
  const points=Array.from({length:10},(_,i)=>({time:Date.parse('2026-01-05T20:00:00Z')+i*86400000,price:100+i}));
  assert.deepEqual(chartEventTimes(points,['2026-01-08','2026-01-20'],7,Date.parse('2026-01-20T12:00:00Z')),[Date.parse('2026-01-08T20:00:00Z')]);
  assert.deepEqual(chartEventMarks(points,['2026-01-08'],7,Date.parse('2026-01-20T12:00:00Z')),[{time:Date.parse('2026-01-08T20:00:00Z'),date:'2026-01-08'}]);
  assert.deepEqual(chartEventTimes(points,['2025-06-01'],7,Date.parse('2026-01-20T12:00:00Z')),[]);
});

test('average path is relative to the earnings close',()=>{
  const points=Array.from({length:21},(_,i)=>({time:Date.parse('2026-01-01T20:00:00Z')+i*86400000,price:100+i}));
  const windows=eventWindows(points,['2026-01-11'],10);
  const avg=averageImpact(windows,10);
  assert.equal(windows.length,1);
  assert.equal(avg.path.find(p=>p.offset===0)?.percent,0);
  assert.ok(avg.day!==null);
});

test('future report dates stay cached a day; today refreshes sooner',()=>{
  assert.equal(nasdaqCacheTtl('2026-09-22','2026-09-21'),86400);
  assert.equal(nasdaqCacheTtl('2026-09-21','2026-09-21'),900);
});

test('homepage preview pins $1T names this week and still shows later days',()=>{
  const days=[
    {date:'2026-09-21',status:'ok',companies:[{symbol:'NKE',reported:false,marketCap:1.2e11},{symbol:'COST',reported:false,marketCap:4e11}]},
    {date:'2026-09-22',status:'ok',companies:[{symbol:'INTC',reported:false,marketCap:1.5e11}]},
    {date:'2026-09-25',status:'ok',companies:[{symbol:'AAPL',reported:false,marketCap:3e12},{symbol:'MSFT',reported:false,marketCap:3.1e12}]},
  ];
  const rows=homePreviewRows(days,'2026-09-21','2026-09-21',{limit:5});
  assert.deepEqual(rows.map(row=>row.symbol).slice(0,2),['MSFT','AAPL']);
  assert.ok(rows.some(row=>row.symbol==='NKE'&&row.date==='2026-09-21'));
  assert.ok(rows.some(row=>row.symbol==='INTC'&&row.date==='2026-09-22'));
  assert.equal(rows.length,5);
});

test('homepage preview skips already-reported names and uses next week when this week is empty',async()=>{
  const now=new Date('2026-09-18T16:00:00Z');
  const data=await earningsHomePreview({now,loadDay:async date=>{
    if(date==='2026-09-14')return [{symbol:'OLD',reported:true,marketCap:2e12}];
    if(date==='2026-09-21')return [{symbol:'NVDA',reported:false,marketCap:4e12}];
    if(date==='2026-09-22')return [{symbol:'AMD',reported:false,marketCap:3e11}];
    return [];
  }});
  assert.equal(data.label,'Reporting next week');
  assert.equal(data.rows[0].symbol,'NVDA');
  assert.ok(data.rows.some(row=>row.symbol==='AMD'&&row.date==='2026-09-22'));
});
