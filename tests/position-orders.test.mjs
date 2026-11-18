import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appendOrder,withOrderTotals} from '../lib/position-orders.mjs';
import {applyGuestAction,emptyGuestState,guestImportPayload,readGuestState,GUEST_KEY} from '../lib/guest-watchlist.mjs';
import {aggregatePortfolio,portfolioTotals} from '../server/portfolio.mjs';
const first={id:'s',symbol:'TEST',quantity:100,costPerShare:10,currentPrice:20,currency:'USD',acquiredAt:'2026-01-01T00:00:00Z',notes:'First'};
const second={quantity:100,costPerShare:15,acquiredAt:'2026-02-01T00:00:00Z'};
void test('legacy order 1 and subsequent orders preserve purchases and calculate weighted totals',()=>{
 const stock=appendOrder(first,second);
 assert.equal(stock.quantity,200);assert.equal(stock.costPerShare,12.5);
 assert.deepEqual(stock.orders.map(o=>o.id),[1,2]);assert.equal(stock.orders[0].notes,'First');
 assert.equal(portfolioTotals([stock]).gain,1500);assert.equal(portfolioTotals([stock]).gainPercent,60);
 assert.equal(appendOrder(stock,{...second,quantity:50}).costPerShare,13);
 assert.equal(first.quantity,100);
});
void test('guest repeated stock and add-order actions keep one stock, preserve export and reject invalid orders',()=>{
 let state=applyGuestAction(emptyGuestState(),{action:'createList'});const listId=state.watchlists[0].id;
 const quote={symbol:'TEST',price:10,currency:'USD'};
 state=applyGuestAction(state,{action:'addStock',listId,...first},quote);
 state=applyGuestAction(state,{action:'addStock',listId,...second},quote);
 assert.equal(state.watchlists[0].stocks.length,1);assert.equal(state.watchlists[0].stocks[0].quantity,200);
 const stockId=state.watchlists[0].stocks[0].id;
 assert.throws(()=>applyGuestAction(state,{action:'addOrder',listId,stockId,...second,quantity:-1}),/positive/);
 assert.equal(guestImportPayload(state)[0].stocks[0].orders.length,2);
 assert.equal(readGuestState({getItem:key=>key===GUEST_KEY?JSON.stringify(state):null}).watchlists[0].stocks[0].costPerShare,12.5);
});
void test('history only includes shares after each order purchase date',()=>{
 const stock=appendOrder(first,second),jan=Date.parse(first.acquiredAt),feb=Date.parse(second.acquiredAt);
 const points=aggregatePortfolio([stock],[{points:[{time:jan,price:10},{time:jan+86400000,price:11},{time:feb,price:15}]}],feb+86400000);
 assert.equal(points[0].cost,1000);assert.equal(points[1].value,1100);
 assert.equal(points.at(-1).cost,2500);assert.equal(points.at(-1).value,4000);
 assert.equal(withOrderTotals(stock).quantity,200);
});
