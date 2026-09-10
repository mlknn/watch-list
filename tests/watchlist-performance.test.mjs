import {test} from 'node:test';import assert from 'node:assert/strict';
import {watchlistPerformance} from '../lib/watchlist-performance.mjs';
const stock=(over={})=>(({quantity:null,costPerShare:null,currency:'USD',addedPrice:100,currentPrice:110,...over}));
test('empty lists have no return',()=>assert.equal(watchlistPerformance({stocks:[]}),null));
test('equal-weight return from added prices when quantities are missing',()=>assert.equal(watchlistPerformance({stocks:[stock({currentPrice:200}),stock({currentPrice:100})]}),50));
test('cost-weighted return when every stock has a position',()=>assert.equal(watchlistPerformance({stocks:[stock({quantity:2,costPerShare:50,currentPrice:75}),stock({quantity:1,costPerShare:100,currentPrice:50})]}),0));
test('mixed currencies are omitted',()=>assert.equal(watchlistPerformance({stocks:[stock(),stock({currency:'EUR'})]}),null));
