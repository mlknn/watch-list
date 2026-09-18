import test from 'node:test';
import assert from 'node:assert/strict';
import {findGroup,getMarket,groupsFor,listMarkets} from '../lib/markets.mjs';
import {exchangeSession} from '../lib/market-tape.mjs';

test('market catalog has US, Europe, Canada and Turkey',()=>{
  assert.deepEqual(listMarkets().map(item=>item.id),['us','eu','ca','tr']);
  assert.equal(getMarket('tr').label,'Turkey');
  assert.equal(getMarket('TR').id,'tr');
  assert.equal(getMarket('nope').id,'us');
});

test('each market has indexes, ETFs and a fetchable group',()=>{
  for(const market of listMarkets()){
    assert.ok(market.indices.length>=2,market.id+' indexes');
    assert.ok(market.etfs.length>=1,market.id+' etfs');
    const groups=groupsFor(market);
    assert.equal(groups[0].id,market.id+'-etfs');
    assert.ok(findGroup(groups[0].id));
    assert.ok(findGroup(groups[1].id));
  }
  assert.ok(findGroup('tech'));
});

test('BIST session is open at noon Istanbul on a weekday',()=>{
  const session=exchangeSession(new Date('2026-09-10T09:00:00Z'),getMarket('tr').session);
  assert.equal(session.code,'open');
  assert.match(session.detail,/BIST/);
});
