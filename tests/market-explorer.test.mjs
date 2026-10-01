import test from 'node:test';
import assert from 'node:assert/strict';
import {explorerRows,filterMarketRows,mergeMarketRows} from '../lib/market-explorer.mjs';
const row=(symbol,change,volume=100)=>({symbol,chart:change===null?null:{companyName:symbol+' company',quote:{changePercent:change,volume,price:10}}});
test('explorer deduplicates symbols and prefers loaded quotes',()=>{
 const rows=explorerRows([{id:'a',title:'A',stocks:[row('ABC',null)]},{id:'b',title:'B',stocks:[row('ABC',2)]}]);
 assert.equal(rows.length,1);assert.equal(rows[0].chart.quote.changePercent,2);
});
test('filters compose and missing quotes sort last rather than as zero',()=>{
 const rows=explorerRows([{id:'tech',title:'Tech',stocks:[row('A',2,500),row('B',-3,800),row('C',null),row('D',0)]}]);
 assert.deepEqual(filterMarketRows(rows,{direction:'down'}).map(r=>r.symbol),['B']);
 assert.deepEqual(filterMarketRows(rows,{sort:'losers'}).map(r=>r.symbol),['B','D','A','C']);
 assert.deepEqual(filterMarketRows(rows,{query:'company',group:'tech',favoritesOnly:true,favorites:['A'],direction:'up'}).map(r=>r.symbol),['A']);
 assert.equal(filterMarketRows(rows,{favoritesOnly:true}).length,0);
 assert.deepEqual(filterMarketRows(rows,{sort:'volume'}).slice(0,2).map(r=>r.symbol),['B','A']);
});

test('partial refresh preserves a previous quote with a stale warning',()=>{
 const previous=[row('A',2),row('B',1)];
 const merged=mergeMarketRows(previous,[{symbol:'A',chart:null,error:'offline'},row('B',3)]);
 assert.equal(merged[0].chart.quote.changePercent,2);assert.equal(merged[0].error,'offline');assert.equal(merged[1].chart.quote.changePercent,3);
});

 test('paginated market updates preserve stocks from other pages',()=>{
  const old=[{symbol:'AAPL',chart:{quote:{price:10}},error:null},{symbol:'MSFT',chart:null,error:null}];
  const rows=mergeMarketRows(old,[{symbol:'MSFT',chart:{quote:{price:20}},error:null}]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].chart.quote.price,10);
  assert.equal(rows[1].chart.quote.price,20);
});
