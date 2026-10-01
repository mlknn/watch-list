import test from 'node:test';
import assert from 'node:assert/strict';
import {listViews} from '../server/cloud.mjs';
const snapshot={symbol:'AAPL',companyName:'Apple',currency:'USD',exchange:'NMS',price:100,quoteTime:'2026-01-01T12:00:00Z',checkedAt:'2026-01-01T12:00:00Z'};
function fixture(saved=[]){
 const stock={id:'stock',symbol:'AAPL',watchlist_id:'list',snapshot,added_at:'2026-01-01T12:00:00Z'};
 return {from(table){return {select(){return this;},in(){return this;},order(){return this;},then(resolve){return Promise.resolve({data:table==='wl_stocks'?[stock]:saved}).then(resolve);}};}};
}
const lists=[{id:'list',name:'Ideas',created_at:'2026-01-01'}];
test('initial watchlist details return without waiting for any provider call',async()=>{
 let calls=0;
 const never=()=>{calls++;return new Promise(()=>{});};
 const views=await listViews(fixture(),lists,false,never);
 assert.equal(calls,0);
 assert.equal(views[0].stocks[0].symbol,'AAPL');
 assert.equal(views[0].stocks[0].currentPrice,100);
});
test('initial load uses stale saved prices immediately; explicit refresh updates them',async()=>{
 const saved={symbol:'AAPL',quote:{...snapshot,price:120,quoteTime:'2026-02-01T12:00:00Z'},fetched_at:'2026-02-01T12:00:00Z'};
 let calls=0;
 const loadQuote=async()=>{calls++;return {...saved,quote:{...snapshot,price:130,quoteTime:'2026-03-01T12:00:00Z'}};};
 const db=fixture([saved]);
 assert.equal((await listViews(db,lists,false,loadQuote))[0].stocks[0].currentPrice,120);
 assert.equal(calls,0);
 assert.equal((await listViews(db,lists,true,loadQuote))[0].stocks[0].currentPrice,130);
 assert.equal(calls,1);
});
test('failed background quote refresh preserves the saved watchlist details',async()=>{
 const views=await listViews(fixture(),lists,true,async()=>{throw Error('Provider unavailable');});
 assert.equal(views[0].name,'Ideas');
 assert.equal(views[0].stocks[0].currentPrice,100);
});
