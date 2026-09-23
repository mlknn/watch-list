import test from 'node:test';
import assert from 'node:assert/strict';
import {averageImpact,eventWindows} from '../lib/earnings-impact.mjs';
import {chartPeriodStats} from '../lib/chart-period.mjs';
import {quoteUnit} from '../lib/instrument.mjs';
import {tapeMovers} from '../lib/market-tape.mjs';
import {earningsCsv,epsSurprise,sortEarningsRows} from '../lib/earnings-compare.mjs';
import {safeReturnPath} from '../lib/safe-return.mjs';

const day=(iso,price)=>({time:Date.parse(iso+'T20:00:00Z'),price});

test('earnings impact uses announcement dates, not fiscal quarter-ends',()=>{
  const points=Array.from({length:40},(_,i)=>{
    const date=new Date(Date.UTC(2026,0,1+i));
    return {time:date.getTime()+20*3600*1000,price:100+i};
  });
  const fromEnds=eventWindows(points,['2025-12-31'],10);
  const fromAnnounce=eventWindows(points,[{date:'2026-01-11',when:'bmo'}],10);
  assert.equal(fromEnds.length,0);
  assert.equal(fromAnnounce.length,1);
  assert.equal(fromAnnounce[0].announced,'2026-01-11');
});

test('after-close announcements use the next session and omit missing later samples',()=>{
  const points=[day('2026-01-08',100),day('2026-01-09',110),day('2026-01-12',121)];
  const windows=eventWindows(points,[{date:'2026-01-08',when:'amc'}],10);
  const impact=averageImpact(windows,10);
  assert.equal(windows[0].date,'2026-01-09');
  assert.equal(impact.daySamples,1);
  assert.equal(impact.after30Samples,0);
  assert.equal(impact.after30,null);
  assert.equal(impact.positive,0);
});

test('1D period percent uses previous close, not the first intraday print',()=>{
  const stats=chartPeriodStats({
    range:'1d',
    points:[{price:99},{price:102}],
    quote:{price:102,previousClose:100,change:2,changePercent:2},
  });
  assert.equal(stats.base,100);
  assert.equal(stats.changePercent,2);
  assert.equal(chartPeriodStats({
    range:'5d',
    points:[{price:90},{price:99}],
    quote:{price:99,previousClose:100,change:-1,changePercent:-1},
  }).changePercent,10);
});

test('index metadata formats as points and equities keep currency',()=>{
  assert.equal(quoteUnit({symbol:'^GSPC',quoteType:'INDEX'}),'points');
  assert.equal(quoteUnit({symbol:'ES=F',quoteType:'FUTURE'}),'currency');
  assert.equal(quoteUnit({symbol:'AAPL',quoteType:'EQUITY'}),'currency');
  assert.equal(quoteUnit({symbol:'^DJI'}),'points');
});

test('gainers stay positive and losers stay negative',()=>{
  const row=(symbol,pct)=>({symbol,chart:{quote:{changePercent:pct}}});
  const {gainers,losers}=tapeMovers([row('DOWN',-1),row('FLAT',0),row('UP',2),row('WORSE',-4)],3);
  assert.deepEqual(gainers.map(r=>r.symbol),['UP']);
  assert.deepEqual(losers.map(r=>r.symbol),['WORSE','DOWN']);
});

test('surprise percent and dollar difference sort separately, with missing last',()=>{
  const rows=[
    {symbol:'ZERO',eps:'$0.20',epsForecast:'$0.00',marketCap:1e9},
    {symbol:'BIG',eps:'$2.00',epsForecast:'$1.00',marketCap:3e9},
    {symbol:'MISS',eps:'',epsForecast:'$1.00',marketCap:null},
    {symbol:'SMALL',eps:'$1.10',epsForecast:'$1.00',marketCap:2e9},
  ];
  assert.deepEqual(sortEarningsRows(rows,{key:'surprisePct',dir:'desc'}).map(r=>r.symbol),['BIG','SMALL','MISS','ZERO']);
  assert.deepEqual(sortEarningsRows(rows,{key:'surpriseAbs',dir:'desc'}).map(r=>r.symbol),['BIG','ZERO','SMALL','MISS']);
  assert.deepEqual(sortEarningsRows(rows,{key:'cap',dir:'asc'}).map(r=>r.symbol),['ZERO','SMALL','BIG','MISS']);
  assert.equal(epsSurprise('$0.20','$0.00').percent,null);
});

test('earnings CSV is rectangular, escaped, and formula-safe',()=>{
  const csv=earningsCsv([
    {symbol:'AAPL',name:'Apple, Inc.',when:'bmo',reported:true,eps:'$1.00',epsForecast:'$0.90',marketCap:3e12,date:'2026-09-21'},
    {symbol:'=CMD',name:'-Risky',when:'unknown',reported:false,eps:'',epsForecast:'',date:'2026-09-22'},
  ],{timezone:'America/New_York',source:'Nasdaq',fetchedAt:'2026-09-23T12:00:00.000Z'});
  const lines=csv.split('\n');
  const fieldCount=line=>{let n=1,q=false;for(const ch of line){if(ch==='"')q=!q;else if(ch===','&&!q)n++;}return n;};
  assert.equal(fieldCount(lines[0]),13);
  assert.equal(fieldCount(lines[1]),13);
  assert.equal(fieldCount(lines[2]),13);
  assert.match(lines[1],/"Apple, Inc."/);
  assert.match(lines[2],/'=CMD/);
  assert.match(lines[2],/'-Risky/);
  assert.match(lines[1],/America\/New_York/);
});

test('return paths stay on this site',()=>{
  assert.equal(safeReturnPath('/earnings?week=2026-09-21'),'/earnings?week=2026-09-21');
  assert.equal(safeReturnPath('https://evil.example/phish'),'/dashboard');
  assert.equal(safeReturnPath('//evil.example'),'/dashboard');
});
