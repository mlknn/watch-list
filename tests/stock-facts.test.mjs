import test from 'node:test';
import assert from 'node:assert/strict';
import {filledFacts,netMargin,targetGap,websiteLabel,weekRangePosition} from '../lib/stock-facts.mjs';

test('missing metrics are omitted instead of shown as blank',()=>{
  assert.deepEqual(filledFacts([{label:'P/E',value:'18.2'},{label:'EPS',value:null},{label:'Beta',value:''}]),[{label:'P/E',value:'18.2'}]);
});

test('52-week marker stays inside the low and high',()=>{
  assert.equal(weekRangePosition(150,100,200),0.5);
  assert.equal(weekRangePosition(50,100,200),0);
  assert.equal(weekRangePosition(250,100,200),1);
  assert.equal(weekRangePosition(100,100,100),null);
});

test('net margin and target gap need both real numbers',()=>{
  assert.equal(netMargin(10,100),10);
  assert.equal(netMargin(10,0),null);
  assert.equal(targetGap(120,100),20);
  assert.equal(targetGap(80,100),-20);
  assert.equal(websiteLabel('https://www.micron.com/about'),'micron.com');
});
