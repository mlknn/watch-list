import test from 'node:test';
import assert from 'node:assert/strict';
import {watchlistAllocation} from '../lib/watchlist-allocation.mjs';

test('allocation sizes by holding value when shares are present',()=>{
  const data=watchlistAllocation({stocks:[
    {symbol:'AAPL',companyName:'Apple',currency:'USD',currentPrice:200,addedPrice:100,quantity:10},
    {symbol:'MSFT',companyName:'Microsoft',currency:'USD',currentPrice:100,addedPrice:80,quantity:10},
  ]});
  assert.equal(data.sizedByValue,true);
  assert.equal(data.total,3000);
  assert.equal(data.slices[0].symbol,'AAPL');
  assert.equal(data.slices[0].weight,2000/3000);
  assert.equal(data.slices[1].weight,1000/3000);
});

test('allocation stays equal-weight until every name has shares',()=>{
  const data=watchlistAllocation({stocks:[
    {symbol:'AAPL',currentPrice:200,addedPrice:100,quantity:10},
    {symbol:'MSFT',currentPrice:100,addedPrice:80,quantity:null},
  ]});
  assert.equal(data.sizedByValue,false);
  assert.equal(data.slices.length,2);
  assert.ok(data.slices.every(row=>row.weight===0.5));
});

test('allocation is equal-weight when no shares are set',()=>{
  const data=watchlistAllocation({stocks:[
    {symbol:'NKE',currentPrice:90,addedPrice:100,quantity:null},
    {symbol:'COST',currentPrice:900,addedPrice:800,quantity:null},
  ]});
  assert.equal(data.sizedByValue,false);
  assert.equal(data.slices.length,2);
  assert.ok(data.slices.every(row=>row.weight===0.5));
});
