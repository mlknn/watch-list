import test from 'node:test';
import assert from 'node:assert/strict';
import {findGroup,getMarket,groupsFor,isCryptoCoin,listMarkets} from '../lib/markets.mjs';
import {exchangeSession} from '../lib/market-tape.mjs';

test('market catalog has US, Europe, Canada, global and crypto',()=>{
  assert.deepEqual(listMarkets().map(item=>item.id),['us','eu','ca','global','crypto']);
  assert.equal(getMarket('global').label,'Global');
  assert.equal(getMarket('tr').id,'global');
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

test('Yahoo coin tickers are treated as crypto, not company pages',()=>{
  assert.equal(isCryptoCoin('LTC-USD'),true);
  assert.equal(isCryptoCoin('btc-usd'),true);
  assert.equal(isCryptoCoin('IBIT'),false);
  assert.equal(isCryptoCoin('BRK-B'),false);
});

test('global covers ten cash markets outside the US, Canada and Europe',()=>{
  const market=getMarket('global');
  assert.equal(market.etfs.length,10);
  assert.ok(groupsFor(market).some(group=>group.title==='Japan'&&group.symbols.includes('7203.T')));
  assert.ok(groupsFor(market).some(group=>group.title==='India'&&group.symbols.includes('RELIANCE.NS')));
  assert.ok(groupsFor(market).some(group=>group.title==='Korea & Taiwan'&&group.symbols.includes('005930.KS')));
  const wednesday=exchangeSession(new Date('2026-09-10T09:00:00Z'),market.session);
  assert.equal(wednesday.code,'open');
  assert.match(wednesday.detail,/rolling/i);
  const sunday=exchangeSession(new Date('2026-09-13T09:00:00Z'),market.session);
  assert.equal(sunday.code,'closed');
});
