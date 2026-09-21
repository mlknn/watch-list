import test from 'node:test';
import assert from 'node:assert/strict';
import {findGroup,getMarket,groupsFor,listMarkets} from '../lib/markets.mjs';
import {exchangeSession} from '../lib/market-tape.mjs';

test('market catalog has US, Europe, Canada, Turkey and crypto',()=>{
  assert.deepEqual(listMarkets().map(item=>item.id),['us','eu','ca','tr','crypto']);
  assert.equal(getMarket('tr').label,'Turkey');
  assert.equal(getMarket('TR').id,'tr');
  assert.equal(getMarket('crypto').kind,'crypto');
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

test('crypto keeps a 24-hour session on Saturday and uses a coin board',()=>{
  const market=getMarket('crypto');
  const session=exchangeSession(new Date('2026-09-12T16:00:00Z'),market.session);
  assert.equal(session.code,'open');
  assert.match(session.label,/24/);
  const groups=groupsFor(market);
  assert.equal(groups[0].title,'Spot ETFs');
  assert.equal(groups[1].kind,'coins');
  assert.ok(groups[1].symbols.includes('BTC-USD'));
});

test('BIST session is open at noon Istanbul on a weekday',()=>{
  const session=exchangeSession(new Date('2026-09-10T09:00:00Z'),getMarket('tr').session);
  assert.equal(session.code,'open');
  assert.match(session.detail,/BIST/);
});
