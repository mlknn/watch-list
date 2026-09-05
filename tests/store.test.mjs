import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store.mjs';
import { normalizeTicker } from '../server/quotes.mjs';

async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), 'watch-list-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const feed = { price: 100, error: false, currency: 'USD', quoteTime: '2026-09-04T20:00:00.000Z' };
  const quote = async symbol => {
    if (feed.error) throw Error('Provider unavailable');
    return { symbol, companyName: `${symbol} Company`, price: feed.price, currency: feed.currency, exchange: 'Nasdaq', quoteTime: feed.quoteTime, checkedAt: new Date().toISOString(), source: 'Test fixture' };
  };
  const store = createStore({ directory, quote });
  const state = await store.read();
  return { store, feed, directory, quote, listId: state.watchlists[0].id };
}
test('starting price, company, and date survive refresh and a new store instance', async t => {
  const { store, feed, directory, quote, listId } = await setup(t);
  let state = await store.action({ action: 'addStock', listId, ticker: ' crdo ' });
  const original = state.watchlists[0].stocks[0];
  assert.equal(original.symbol, 'CRDO'); assert.equal(original.addedPrice, 100);
  feed.price = 115;
  state = await store.action({ action: 'refresh' });
  assert.equal(state.watchlists[0].stocks[0].currentPrice, 115);
  const reopened = await createStore({ directory, quote }).read();
  const stock = reopened.watchlists[0].stocks[0];
  assert.equal(stock.addedPrice, 100); assert.equal(stock.addedAt, original.addedAt); assert.equal(stock.currentPrice, 115);
  assert.equal(stock.companyName, 'CRDO Company');
  assert.equal(JSON.parse(await readFile(store.file, 'utf8')).version, 1);
  assert.equal(JSON.parse(await readFile(`${store.file}.bak`, 'utf8')).watchlists[0].stocks[0].currentPrice, 100);
});
test('failed refresh preserves last quote and sets a visible error; recovery clears it', async t => {
  const { store, feed, listId } = await setup(t);
  await store.action({ action: 'addStock', listId, ticker: 'AAPL' }); feed.error = true;
  let state = await store.action({ action: 'refresh' });
  assert.equal(state.watchlists[0].stocks[0].currentPrice, 100); assert.equal(state.watchlists[0].stocks[0].quoteError, 'Provider unavailable');
  feed.error = false; feed.price = 80;
  state = await store.action({ action: 'refresh' });
  assert.equal(state.watchlists[0].stocks[0].currentPrice, 80); assert.equal(state.watchlists[0].stocks[0].quoteError, null); assert.equal(state.watchlists[0].stocks[0].addedPrice, 100);
});
test('concurrent additions do not lose updates; concurrent duplicates are rejected', async t => {
  const { store, listId } = await setup(t);
  await Promise.all(['AAPL','MSFT','CRDO'].map(ticker => store.action({ action:'addStock', listId, ticker })));
  assert.equal((await store.read()).watchlists[0].stocks.length, 3);
  const result = await Promise.allSettled([1,2].map(() => store.action({action:'addStock',listId,ticker:'NVDA'})));
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await store.read()).watchlists[0].stocks.length, 4);
});
test('multiple lists are independent and support rename and deletion', async t => {
  const { store, listId } = await setup(t);
  const state = await store.action({ action:'createList',name:'Ideas' }); const second=state.watchlists[1].id;
  await store.action({action:'addStock',listId,ticker:'CRDO'});
  await store.action({action:'addStock',listId:second,ticker:'CRDO'});
  await store.action({action:'renameList',listId:second,name:'Long term'});
  const current = await store.read();
  assert.equal(current.watchlists[1].name,'Long term');
  await store.action({action:'removeStock',listId,stockId:current.watchlists[0].stocks[0].id});
  assert.equal((await store.read()).watchlists[1].stocks.length,1);
  await store.action({action:'deleteList',listId});
  await assert.rejects(store.action({action:'deleteList',listId:second}),/at least one/);
});
test('malformed JSON is preserved and never silently reset', async t => {
  const { store } = await setup(t);
  await writeFile(store.file,'{broken');
  await assert.rejects(store.read(),/damaged/);
  await assert.rejects(store.action({action:'createList',name:'Ideas'}),/damaged/);
  assert.equal(await readFile(store.file,'utf8'),'{broken');
});
test('currency changes and older quotes cannot corrupt comparisons', async t => {
  const { store, feed, listId } = await setup(t);
  await store.action({action:'addStock',listId,ticker:'MSFT'});
  feed.currency='EUR';feed.price=500;
  let state=await store.action({action:'refresh'});
  assert.equal(state.watchlists[0].stocks[0].currentPrice,100);
  assert.match(state.watchlists[0].stocks[0].quoteError,/currency/);
  feed.currency='USD';feed.quoteTime='2026-09-03T20:00:00.000Z';
  state=await store.action({action:'refresh'});
  assert.equal(state.watchlists[0].stocks[0].currentPrice,100);
});
test('invalid names and tickers leave saved data unchanged', async t => {
  const {store,listId}=await setup(t);
  const original=await readFile(store.file,'utf8');
  await assert.rejects(store.action({action:'createList',name:'  '}));
  await assert.rejects(store.action({action:'addStock',listId,ticker:'../../etc/passwd'}));
  await assert.rejects(store.action({action:'addStock',listId,ticker:123}));
  assert.equal(await readFile(store.file,'utf8'),original);
  assert.equal(normalizeTicker(' vod.l '),'VOD.L');
});
