import test from 'node:test';
import assert from 'node:assert/strict';
import {formatMoney} from '../lib/price-format.mjs';
import {cryptoSymbolParam,filterCoins,sortCoins} from '../lib/crypto-markets.mjs';

const symbols=['BTC-USD','ETH-USD','SOL-USD','SHIB-USD'];
const row=(symbol,price,changePercent)=>({symbol,chart:{quote:{price,changePercent}}});

test('crypto prices keep cents for bitcoin and significant decimals for tiny tokens',()=>{
  assert.match(formatMoney(65382.41,'USD'),/65[,.\s]?382[,.]41/);
  assert.match(formatMoney(145.82,'USD'),/145[,.]82/);
  assert.match(formatMoney(0.1234,'USD'),/0[,.]1234/);
  assert.match(formatMoney(0.00001234,'USD'),/0[,.]00001234/);
  assert.doesNotMatch(formatMoney(0.00001234,'USD'),/0[,.]00$/);
});

test('crypto symbol query accepts a code or a yahoo ticker and falls back to bitcoin',()=>{
  assert.equal(cryptoSymbolParam('eth',symbols),'ETH-USD');
  assert.equal(cryptoSymbolParam('SOL-USD',symbols),'SOL-USD');
  assert.equal(cryptoSymbolParam('nope',symbols),'BTC-USD');
  assert.equal(cryptoSymbolParam('',symbols),'BTC-USD');
});

test('coin filters and sorts use only the supplied quotes',()=>{
  const rows=[row('SOL-USD',100,8),row('DOGE-USD',0.1,-5),row('ADA-USD',1,null),row('BTC-USD',10,1)];
  assert.deepEqual(filterCoins(rows,'gainers').map(item=>item.symbol),['SOL-USD','BTC-USD']);
  assert.deepEqual(filterCoins(rows,'losers').map(item=>item.symbol),['DOGE-USD']);
  assert.deepEqual(sortCoins(rows,'change').map(item=>item.symbol),['SOL-USD','BTC-USD','DOGE-USD','ADA-USD']);
  assert.deepEqual(sortCoins(rows,'price').map(item=>item.symbol),['SOL-USD','BTC-USD','ADA-USD','DOGE-USD']);
});
