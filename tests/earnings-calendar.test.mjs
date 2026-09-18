import test from 'node:test';
import assert from 'node:assert/strict';
import {averageImpact,eventWindows} from '../lib/earnings-impact.mjs';
import {earningsWeek,mondayOnOrBefore,normalizeDayRows,toYahooSymbol,weekDays,clampMonday,earningsWindow,addDays} from '../server/earnings-calendar.mjs';

test('class shares map to Yahoo tickers',()=>{
  assert.equal(toYahooSymbol('BRK.B'),'BRK-B');
  assert.equal(toYahooSymbol('aapl'),'AAPL');
  assert.equal(toYahooSymbol('../x'),'');
});

test('week starts Monday and has five weekday columns',()=>{
  assert.equal(mondayOnOrBefore('2026-09-18'),'2026-09-14');
  assert.deepEqual(weekDays('2026-09-14'),['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18']);
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
  assert.equal(rows.length,2);
});

test('calendar fetch uses injected days and keeps column order',async()=>{
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
  assert.equal(data.weeks.length,1);
  assert.equal(data.weeks[0].days.length,5);
  assert.equal(data.weeks[0].days[0].date,'2026-09-14');
  assert.equal(data.weeks[0].days[0].companies[0].when,'bmo');
  assert.equal(data.weeks[0].days[4].date,'2026-09-18');
  assert.equal(data.weeks[0].days[4].companies[0].when,'amc');
  assert.equal(data.weeks[0].days[2].date,'2026-09-16');
  assert.equal(data.weeks[0].days[2].companies[0].symbol,'INTC');
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

test('average path is relative to the earnings close',()=>{
  const points=Array.from({length:21},(_,i)=>({time:Date.parse('2026-01-01T20:00:00Z')+i*86400000,price:100+i}));
  const windows=eventWindows(points,['2026-01-11'],10);
  const avg=averageImpact(windows,10);
  assert.equal(windows.length,1);
  assert.equal(avg.path.find(p=>p.offset===0)?.percent,0);
  assert.ok(avg.day!==null);
});
