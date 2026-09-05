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
