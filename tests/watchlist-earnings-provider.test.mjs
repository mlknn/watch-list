import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsSymbols,watchlistEarnings} from '../server/watchlist-earnings.mjs';
const now=new Date('2026-09-30T18:00:00Z');
test('batch validates limits and deduplicates tickers',()=>{
 assert.deepEqual(earningsSymbols('aapl,AAPL,MSFT'),['AAPL','MSFT']);assert.throws(()=>earningsSymbols(''));assert.throws(()=>earningsSymbols('../bad'));assert.throws(()=>earningsSymbols(Array.from({length:21},(_,i)=>'A'+i).join(',')));
});
test('distinguishes no published date from service failure and retains successful rows',async()=>{
 const result=await watchlistEarnings(['AAPL','SPY','FAIL'],{now,store:new Map(),provider:async symbol=>{if(symbol==='FAIL')throw Error('offline');return symbol==='SPY'?{}:{calendarEvents:{earnings:{earningsDate:[new Date('2026-10-29T20:00:00Z')]}}};}});
 assert.deepEqual(result.rows.map(r=>r.status),['available','unknown','unavailable']);assert.equal(result.rows[0].date,'2026-10-29');
});
test('stalled provider times out and can use recent cached dates',async()=>{
 const store=new Map([['AAPL',{at:+now-600000,row:{symbol:'AAPL',date:'2026-10-29',status:'available'}}]]);
 const result=await watchlistEarnings(['AAPL','FAIL'],{now,store,timeout:10,provider:()=>new Promise(()=>{})});
 assert.equal(result.rows[0].status,'stale');assert.equal(result.rows[1].status,'unavailable');
});
test('instruments with no fundamentals are not reported as provider failures',async()=>{
 const result=await watchlistEarnings(['SPY'],{now,store:new Map(),provider:async()=>{throw Error('No fundamentals data found for symbol: SPY');}});
 assert.equal(result.rows[0].status,'unknown');
});
