import test from 'node:test';
import assert from 'node:assert/strict';
import {compareOg,earningsOg,marketsOg,watchlistsOg} from '../lib/page-share-cards.mjs';

test('each public page has its own share-card copy',()=>{
  const titles=[earningsOg.title,marketsOg.title,watchlistsOg.title,compareOg.title];
  assert.equal(new Set(titles).size,4);
  assert.match(earningsOg.alt,/Earnings calendar/);
  assert.match(marketsOg.alt,/Markets/);
  assert.match(watchlistsOg.alt,/Watchlists/);
  assert.match(compareOg.alt,/compared/);
});

test('earnings card keeps surprise percent separate from the dollar difference',()=>{
  const results=earningsOg.columns.find(column=>column.title==='Results');
  assert.ok(results);
  assert.deepEqual(results.rows.map(row=>row.name),['Difference','Surprise %','Zero estimate']);
  assert.match(earningsOg.footnote,/Nasdaq/);
});

test('markets card labels indexes as points, not dollars',()=>{
  const majors=marketsOg.columns.find(column=>column.title==='Majors');
  assert.ok(majors);
  assert.equal(majors.rows.find(row=>row.name==='S&P 500')?.value,'Points');
  assert.equal(majors.rows.find(row=>row.name==='Bitcoin')?.value,'USD');
});
