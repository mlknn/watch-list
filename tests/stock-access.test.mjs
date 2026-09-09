import test from 'node:test';
import assert from 'node:assert/strict';
import {requireStockAccess} from '../server/stock-access.mjs';
const request=new Request('http://localhost/stocks/CRDO');
const lists=[{id:'mine',owner_id:'me'},{id:'theirs',owner_id:'other'}];const stocks=[{id:'1',watchlist_id:'mine',symbol:'MU'},{id:'2',watchlist_id:'theirs',symbol:'CRDO'}];
const authenticate=async()=>({user:{id:'me'},db:{from(table){let rows=table==='wl_watchlists'?lists:stocks;return {select(){return this;},eq(k,v){rows=rows.filter(r=>r[k]===v);return this;},in(k,v){rows=rows.filter(r=>v.includes(r[k]));return this;},then(resolve){return Promise.resolve({data:rows}).then(resolve);}};}}});
test('stock details require login before checking holdings',async()=>{await assert.rejects(requireStockAccess(request,'MU',async()=>{throw Object.assign(Error('Sign in'),{status:401});}),e=>e.status===401);});
test('changing the URL cannot access another member’s stock or an untracked stock',async()=>{for(const symbol of ['CRDO','GOOGL'])await assert.rejects(requireStockAccess(request,symbol,authenticate),e=>e.status===403);});
test('a stock in the signed-in member’s own dashboard is accessible',async()=>{assert.equal((await requireStockAccess(request,'mu',authenticate)).symbol,'MU');});

test('welcome stocks including Walmart are public without authentication',async()=>{for(const symbol of ['WMT','aapl','UNH','NKE'])assert.equal((await requireStockAccess(request,symbol,async()=>assert.fail('Public stock requested login'))).symbol,symbol.toUpperCase());});
test('public access uses exact ticker matches, never prefixes',async()=>{await assert.rejects(requireStockAccess(request,'AAPLX',async()=>{throw Object.assign(Error('Sign in'),{status:401});}),e=>e.status===401);});
