import test from 'node:test';
import assert from 'node:assert/strict';
import {logoSources} from '../lib/company-logos.mjs';

test('logo URLs skip the hanging FMP host and try Parqet aliases',()=>{
  const apple=logoSources('AAPL');
  assert.equal(apple[0],'https://assets.parqet.com/logos/symbol/AAPL?format=png');
  assert.equal(apple.every(url=>url.includes('assets.parqet.com')&&!url.includes('financialmodelingprep')),true);
  assert.equal(logoSources('btc-usd')[1],'https://assets.parqet.com/logos/symbol/BTC?format=png');
  assert.equal(logoSources('GC=F').some(url=>url.includes('GOLD')),true);
  assert.equal(logoSources('BRK-B').includes('https://assets.parqet.com/logos/symbol/BRK-B?format=png'),true);
});
