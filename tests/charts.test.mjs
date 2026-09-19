import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsEventDays,normalizeChart,getChart} from '../server/charts.mjs';
import {chartPeriodStats,seriesPeriodStats} from '../lib/chart-period.mjs';
const fixture=()=>({meta:{symbol:'TEST',longName:'Test Corporation',currency:'USD',exchangeTimezoneName:'America/New_York',regularMarketPrice:112,regularMarketTime:1788552000,regularMarketDayLow:105,regularMarketDayHigh:114},timestamp:[Date.parse('2026-09-03T19:55:00Z')/1000,Date.parse('2026-09-04T13:30:00Z')/1000,Date.parse('2026-09-04T13:35:00Z')/1000,Date.parse('2026-09-04T19:55:00Z')/1000],indicators:{quote:[{close:[100,106,null,112],open:[99,105,106,111],low:[98,105,null,111],high:[101,107,null,114],volume:[50,100,0,200]}]}});
test('1D returns latest trading session only and derives its prior close',()=>{const chart=normalizeChart(fixture(),'1d');assert.equal(chart.points.length,2);assert.equal(chart.quote.previousClose,100);assert.equal(chart.quote.change,12);assert.equal(chart.quote.changePercent,12);assert.equal(chart.quote.open,105);assert.ok(chart.points.every(p=>new Date(p.time).toISOString().startsWith('2026-09-04')));assert.equal(chart.companyName,'Test Corporation');});
test('multi-day chart retains prior sessions and ignores null bars',()=>{assert.equal(normalizeChart(fixture(),'5d').points.length,3);});
test('empty intraday series does not fabricate points',()=>{const input=fixture();input.timestamp=[];assert.deepEqual(normalizeChart(input,'1d').points,[]);});
test('unsupported range or unsafe symbol fails before any network request',async()=>{await assert.rejects(getChart('AAPL','invalid'),/supported chart range/);await assert.rejects(getChart('../private','1d'),/Use a ticker/);});
test('latest-session selection follows exchange timezone across UTC midnight',()=>{const input=fixture();input.meta.exchangeTimezoneName='Asia/Tokyo';input.timestamp=[Date.parse('2026-09-03T14:55:00Z')/1000,Date.parse('2026-09-03T23:30:00Z')/1000,Date.parse('2026-09-04T00:30:00Z')/1000];input.indicators.quote[0].close=[100,106,112];const chart=normalizeChart(input,'1d');assert.equal(chart.points.length,2);assert.equal(chart.quote.previousClose,100);});

test('period percent follows the selected range instead of today only',()=>{
  const quote={price:97,previousClose:100,change:-3,changePercent:-3};
  assert.equal(chartPeriodStats({range:'1d',points:[{price:99},{price:97}],quote}).changePercent,-3);
  assert.equal(Math.round(chartPeriodStats({range:'5d',points:[{price:90},{price:95},{price:97}],quote}).changePercent*100)/100,7.78);
  assert.equal(seriesPeriodStats([{value:1000},{value:1100},{value:900}]).changePercent,-10);
});

test('provider official previous close takes precedence over the last intraday bar',()=>{const input=fixture();input.meta.previousClose=99.5;assert.equal(normalizeChart(input,'1d').quote.previousClose,99.5);});
test('past Yahoo earnings events become marker dates',()=>{
  const input=fixture();
  input.events={earnings:{
    '1756684800':{date:1756684800},
    'future':{date:Date.parse('2026-12-01T00:00:00Z')/1000},
  }};
  assert.deepEqual(earningsEventDays(input,Date.parse('2026-09-18T16:00:00Z')),['2025-09-01']);
  assert.deepEqual(normalizeChart(input,'5d').earningsDates,['2025-09-01']);
});
