import test from 'node:test';
import assert from 'node:assert/strict';
import {nyseSession,tapeBreadth,tapeMovers,sectorAverage} from '../lib/market-tape.mjs';

const row=(symbol,pct)=>({symbol,chart:{quote:{changePercent:pct,price:10,currency:'USD'},companyName:symbol}});

test('NYSE session is open at noon Eastern on a weekday',()=>{
  const session=nyseSession(new Date('2026-09-10T16:00:00Z'));
  assert.equal(session.code,'open');
  assert.match(session.detail,/Closes in/);
});

test('NYSE session is closed on Saturday',()=>{
  assert.equal(nyseSession(new Date('2026-09-12T16:00:00Z')).code,'closed');
});

test('tape breadth and movers come from unique quoted names',()=>{
  const rows=[row('AAPL',3),row('MSFT',1),row('NVDA',-4),row('AAPL',3),row('AMD',0)];
  const breadth=tapeBreadth(rows);
  assert.equal(breadth.quoted,4);
  assert.equal(breadth.up,2);
  assert.equal(breadth.down,1);
  const {gainers,losers}=tapeMovers(rows,2);
  assert.equal(gainers[0].symbol,'AAPL');
  assert.equal(losers[0].symbol,'NVDA');
  assert.equal(sectorAverage([row('AAPL',2),row('MSFT',4)]),3);
});
