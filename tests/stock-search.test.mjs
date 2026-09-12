import test from 'node:test';
import assert from 'node:assert/strict';
import { getTickerSuggestions } from '../lib/stock-search.mjs';

test('stock suggestions match ticker and company names', () => {
  const bySymbol = getTickerSuggestions('A');
  assert.ok(bySymbol.some(item => item.symbol === 'AAPL'));
  assert.ok(bySymbol.some(item => item.symbol === 'AAL'));

  const byCompany = getTickerSuggestions('air');
  assert.ok(byCompany.some(item => item.symbol === 'AAL'));

  const byAlias = getTickerSuggestions('dell');
  assert.ok(byAlias.some(item => item.symbol === 'DELL'));

  const byTicker = getTickerSuggestions('ms');
  assert.ok(byTicker.some(item => item.symbol === 'MSFT'));
});

test('european, canadian and turkish tickers appear in local suggestions',()=>{
  assert.ok(getTickerSuggestions('thy').some(item=>item.symbol==='THYAO.IS'));
  assert.ok(getTickerSuggestions('asml').some(item=>item.symbol==='ASML.AS'));
  assert.ok(getTickerSuggestions('royal').some(item=>item.symbol==='RY.TO'));
  assert.ok(getTickerSuggestions('aapl',8,'USD').every(item=>!item.symbol.endsWith('.IS')&&!item.symbol.endsWith('.TO')));
  assert.ok(getTickerSuggestions('thy',8,'TRY').every(item=>item.symbol.endsWith('.IS')));
  assert.ok(getTickerSuggestions('ry',8,'CAD').every(item=>item.symbol.endsWith('.TO')||item.symbol.endsWith('.V')||item.symbol.endsWith('.CN')||item.symbol.endsWith('.NE')));
});
test('one letter suggests company and ticker prefixes including Tesla and T-Mobile',()=>{const items=getTickerSuggestions('t',8);assert.ok(items.some(s=>s.symbol==='TSLA'));assert.ok(items.some(s=>s.symbol==='TMUS'));assert.equal(items[0].symbol,'T');});
test('full company name resolves to its ticker before stock creation',async()=>{const {resolveStockInput}=await import('../lib/stock-search.mjs');assert.equal(await resolveStockInput('Tesla'),'TSLA');assert.equal(await resolveStockInput('Apple Inc.'),'AAPL');assert.equal(await resolveStockInput('tsla'),'TSLA');await assert.rejects(resolveStockInput('not an actual company'),/Choose a company/);});
test('search ranking deduplicates entries, prioritizes exact matches, and bounds results',async()=>{const {rankStockSuggestions}=await import('../lib/stock-search.mjs');const entries=[{symbol:'TSLA',name:'Tesla Inc.'},{symbol:'TSLA',name:'Tesla'},{symbol:'TMUS',name:'T-Mobile US'}];assert.equal(rankStockSuggestions('tesla',entries).length,1);assert.equal(rankStockSuggestions('t',entries,1).length,1);assert.deepEqual(rankStockSuggestions('',entries),[]);});

test('primary catalog listing stays ahead of duplicate overseas company listings',async()=>{const {rankStockSuggestions}=await import('../lib/stock-search.mjs');const items=rankStockSuggestions('Tesla',[...getTickerSuggestions('Tesla'),{symbol:'TL0.F',name:'Tesla, Inc.'},{symbol:'TSLA01.BK',name:'Tesla, Inc.'}]);assert.equal(items[0].symbol,'TSLA');});
