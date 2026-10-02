import test from 'node:test';
import assert from 'node:assert/strict';
import {parseImport,scenario,benchmarkRace,makeCheckpoint} from '../lib/idea-lab.mjs';
test('import handles exchange prefixes, duplicates, capacity and unsupported exchanges',()=>{
 const rows=parseImport('NASDAQ:AAPL,NYSE:V,TSX:RY,LSE:VOD,V,NVDA',['AAPL'],2);
 assert.ok(rows[0].reason);assert.deepEqual(rows.filter(r=>!r.reason).map(r=>r.symbol),['V','RY.TO']);
 assert.equal(rows[3].reason,'Unsupported exchange prefix');assert.equal(rows.at(-1).reason,'Watchlist limit reached');
});
test('CSV parser imports only the symbol column, including quoted multiline notes',()=>{
 const rows=parseImport('Company,Ticker,Note\r\n"Apple, Inc.",AAPL,"line one\nMSFT"\r\nMicrosoft,MSFT,"a ""quote"""');
 assert.deepEqual(rows.map(r=>r.symbol),['AAPL','MSFT']);
 assert.throws(()=>parseImport('Ticker,Notes\nAAPL,"unterminated'));
 assert.throws(()=>parseImport('A'.repeat(100001)));
});
const stocks=[{symbol:'A',currency:'USD',currentPrice:100,quantity:1},{symbol:'B',currency:'USD',currentPrice:50,quantity:6}];
test('scenario makes equal-weight and holding-weight dollar contributions without mutating holdings',()=>{
 const before=structuredClone(stocks);
 assert.equal(scenario(stocks,1000,{A:-20,B:10}).impact,-50);
 assert.equal(scenario(stocks,1000,{A:-20,B:10},'holdings').impact,25);
 assert.equal(scenario(stocks,1000,{A:-100,B:-100}).end,0);
 assert.deepEqual(stocks,before);
 assert.throws(()=>scenario([...stocks,{...stocks[0],currency:'EUR'}],1000));
 assert.throws(()=>scenario(stocks,0));assert.throws(()=>scenario(stocks,1000,{A:-101}));
 assert.throws(()=>scenario([{...stocks[0],quantity:null}],1000,{},'holdings'));
});
const points=values=>values.map(([date,price])=>({time:Date.parse(date+'T16:00:00Z'),price}));
test('benchmark aligns common dates, starts after add date and reports percentage-point difference',()=>{
 const a={currency:'USD',points:points([['2026-09-01',50],['2026-09-02',100],['2026-09-03',110],['2026-09-04',120]])};
 const b={currency:'USD',points:points([['2026-09-01',50],['2026-09-02',200],['2026-09-04',210]])};
 const result=benchmarkRace(a,b,'2026-09-02T12:00:00Z');
 assert.equal(result.start,'2026-09-02');assert.equal(result.end,'2026-09-04');assert.equal(result.points.length,2);
 assert.ok(Math.abs(result.stockReturn-20)<1e-8);assert.ok(Math.abs(result.excess-15)<1e-8);
 assert.throws(()=>benchmarkRace(a,{...b,currency:'EUR'},'2026-09-02'));
 assert.throws(()=>benchmarkRace(a,b,'2026-08-01'));assert.throws(()=>benchmarkRace(a,b,'2026-09-04'));
});
test('checkpoints freeze the price and validate rationale and review dates',()=>{
 const stock={...stocks[0],quoteTime:'2026-10-01T12:00:00Z'};
 const input={stock,thesis:' Improving margins ',invalidation:'Margins reverse',reviewDate:'2026-10-15'};
 const checkpoint=makeCheckpoint(input,new Date('2026-10-01T12:00:00Z'));stock.currentPrice=200;
 assert.equal(checkpoint.price,100);assert.equal(checkpoint.thesis,'Improving margins');
 assert.throws(()=>makeCheckpoint({...input,thesis:''}));
 assert.throws(()=>makeCheckpoint({...input,reviewDate:'2027-02-30'}));
 assert.throws(()=>makeCheckpoint({...input,reviewDate:'2026-09-30'},new Date('2026-10-01')));
});

test('TradingView section headings never become imported tickers',()=>{
 assert.deepEqual(parseImport('###US TECH STOCKS,NASDAQ:AAPL,NASDAQ:MSFT,###BANKS AND FUNDS,NYSE:V').map(r=>r.symbol),['AAPL','MSFT','V']);
});
