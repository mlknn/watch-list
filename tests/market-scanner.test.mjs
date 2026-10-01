import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyScan,scanRows,rangePosition,scanError,scanPresets} from '../lib/market-scanner.mjs';
const row=(symbol,price,changePercent,volume,currency='USD')=>({symbol,error:null,chart:{currency,quote:{price,changePercent,volume,fiftyTwoWeekLow:10,fiftyTwoWeekHigh:110}}});
const rows=[row('UP',105,3,2e6),row('DOWN',15,-4,3e6),row('FLAT',55,0,200),row('EUR',60,2,3e6,'EUR')];
test('scanner combines inclusive numeric bounds and currency without converting prices',()=>{
 const scan={...emptyScan,minPrice:'50',maxPrice:'105',minChange:'2',minVolume:'1000000',currency:'USD'};
 assert.deepEqual(scanRows(rows,scan).map(r=>r.symbol),['UP']);
 assert.deepEqual(scanRows(rows,{...scan,currency:'EUR'}).map(r=>r.symbol),['EUR']);
});
test('quick scans use actual values and 52-week position thresholds',()=>{
 const expected={all:['UP','DOWN','FLAT','EUR'],gainers:['UP','EUR'],losers:['DOWN'],active:['UP','DOWN','EUR'],high:['UP'],low:['DOWN']};
 for(const preset of scanPresets)assert.deepEqual(scanRows(rows,{...emptyScan,...preset.values}).map(r=>r.symbol),expected[preset.id]);
 assert.equal(rangePosition({price:110,fiftyTwoWeekLow:10,fiftyTwoWeekHigh:110}),100);
 assert.equal(rangePosition({price:120,fiftyTwoWeekLow:10,fiftyTwoWeekHigh:110}),100);
 assert.equal(rangePosition({price:10,fiftyTwoWeekLow:10,fiftyTwoWeekHigh:10}),null);
});
test('missing fields never pass active numeric filters; stale quotes never enter scans',()=>{
 const missing=row('MISSING',50,null,null);
 assert.equal(scanRows([missing],{...emptyScan,minVolume:'0'}).length,0);
 assert.equal(scanRows([missing],{...emptyScan,minChange:'-10'}).length,0);
 assert.equal(scanRows([{...rows[0],error:'offline'},{symbol:'PENDING',chart:null}]).length,0);
 assert.equal(scanRows([missing]).length,1);
});
test('invalid and reversed ranges show an error rather than silently scanning',()=>{
 for(const patch of [{minPrice:'-1'},{minVolume:'bad'},{minPrice:'10',maxPrice:'5'},{minChange:'3',maxChange:'-2'}]){
  assert.ok(scanError({...emptyScan,...patch}));
  assert.equal(scanRows(rows,{...emptyScan,...patch}).length,0);
 }
 assert.equal(scanError({...emptyScan,minChange:'-5',maxChange:'0'}),'');
});
