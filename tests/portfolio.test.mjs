import {test} from 'node:test';import assert from 'node:assert/strict';
import {portfolioTotals,aggregatePortfolio,dailyPortfolioPoints,portfolioHistory} from '../server/portfolio.mjs';
import {capitalAdjustedPortfolioPoints} from '../lib/portfolio-period.mjs';
const stock=(overrides={})=>({symbol:'TEST',quantity:100,costPerShare:10,currentPrice:12,currency:'USD',acquiredAt:new Date(1000).toISOString(),...overrides});
test('portfolio totals use quantities and cost basis; missing positions are explicit',()=>{assert.deepEqual(portfolioTotals([stock(),stock({quantity:20,costPerShare:20,currentPrice:15}),stock({quantity:null})]),{cost:1400,value:1500,gain:100,gainPercent:100/1400*100,positions:2,incomplete:1});});
test('portfolio cannot silently aggregate different currencies',()=>{assert.throws(()=>portfolioTotals([stock({currency:'EUR'})]),/USD/);});
test('history includes holdings only from purchase date and separates contributed capital',()=>{const stocks=[stock(),stock({quantity:10,acquiredAt:new Date(3000).toISOString()})],chart={points:[{time:1000,price:10},{time:2000,price:11},{time:3000,price:12}]};const points=aggregatePortfolio(stocks,[chart,chart],4000);assert.deepEqual(points.map(p=>p.cost),[1000,1000,1100,1100]);assert.equal(points.at(-1).value,1320);assert.equal(points.at(-1).gain,220);});

test('daily portfolio snapshots keep the final value per trading date',()=>{const points=[{time:Date.parse('2026-09-08T14:00Z'),value:100,cost:90},{time:Date.parse('2026-09-08T20:00Z'),value:110,cost:90},{time:Date.parse('2026-09-09T14:00Z'),value:120,cost:95}];const daily=dailyPortfolioPoints(points);assert.deepEqual(daily.map(p=>p.value),[110,120]);assert.equal(daily[0].time,Date.parse('2026-09-08T12:00Z'));assert.equal(daily[1].cost,95);});

test('adding stocks at cost does not count as a portfolio return',()=>{
 const points=[{time:1,value:31534,cost:31534,gain:0},{time:2,value:116172,cost:116172,gain:0}];
 const adjusted=capitalAdjustedPortfolioPoints(points);
 assert.equal(adjusted[0].value,31534);
 assert.ok(Math.abs(adjusted[1].value-31534)<1e-6);
});

test('price gains still raise the capital-adjusted portfolio value',()=>{
 const points=[{time:1,value:1000,cost:1000,gain:0},{time:2,value:1100,cost:1000,gain:100}];
 const adjusted=capitalAdjustedPortfolioPoints(points);
 assert.equal(adjusted[1].value,1100);
});

test('added capital plus a later price gain only counts the gain',()=>{
 const points=[{time:1,value:1000,cost:1000,gain:0},{time:2,value:3000,cost:3000,gain:0},{time:3,value:3300,cost:3000,gain:300}];
 const adjusted=capitalAdjustedPortfolioPoints(points);
 assert.ok(Math.abs(adjusted[1].value-1000)<1e-6);
 assert.ok(Math.abs(adjusted[2].value-1100)<1e-6);
});

test('new multi-stock portfolio returns its first daily snapshot without historical fetches',async()=>{
 const now=Date.parse('2026-09-09T21:00:00Z');
 const stocks=['IONQ','TSLA','AMZN','XYZ','GOOGL'].map(symbol=>stock({symbol,acquiredAt:'2026-09-09T04:00:00Z'}));
 const original=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;throw new Error('Unexpected history request');};
 try{const history=await portfolioHistory({mode:'advanced',stocks},'max',now);assert.equal(requests,0);assert.equal(history.points.length,1);assert.equal(history.points[0].value,6000);assert.equal(history.points[0].cost,5000);assert.equal(history.points[0].time,Date.parse('2026-09-09T12:00:00Z'));}finally{globalThis.fetch=original;}
});
