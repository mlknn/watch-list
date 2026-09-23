import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyGuestAction,emptyGuestState,guestHasDraft,guestImportPayload,readGuestState,writeGuestState,clearGuestState,GUEST_KEY} from '../lib/guest-watchlist.mjs';

function memory(){
  const data=new Map();
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key)
  };
}

test('guest lists persist across reload and survive a failed save attempt',()=>{
  const storage=memory();
  let state=emptyGuestState();
  state=applyGuestAction(state,{action:'createList'});
  writeGuestState(state,storage);
  const quote={symbol:'AAPL',companyName:'Apple',currency:'USD',exchange:'Nasdaq',price:190,quoteTime:'2026-09-10T20:00:00.000Z',checkedAt:'2026-09-10T20:00:00.000Z'};
  state=applyGuestAction(readGuestState(storage),{action:'addStock',listId:state.watchlists[0].id,ticker:'AAPL',quantity:10,costPerShare:180,acquiredAt:'2026-01-02T00:00:00.000Z',notes:'Core'},quote);
  writeGuestState(state,storage);
  const restored=readGuestState(storage);
  assert.equal(restored.watchlists[0].name,'My watchlist');
  assert.equal(restored.watchlists[0].stocks[0].symbol,'AAPL');
  assert.equal(restored.watchlists[0].stocks[0].quantity,10);
  assert.equal(guestHasDraft(restored),true);
  assert.deepEqual(guestImportPayload(restored)[0].stocks[0].symbol,'AAPL');
  clearGuestState(storage);
  assert.equal(storage.getItem(GUEST_KEY),null);
});

test('legacy guest lists without a role can still be edited',()=>{
  const storage=memory();
  storage.setItem(GUEST_KEY,JSON.stringify({version:1,updatedAt:'2026-09-01T00:00:00.000Z',watchlists:[{id:'list-1',name:'Old list',mode:'advanced',createdAt:'2026-09-01T00:00:00.000Z',stocks:[],shareToken:null}]}));
  assert.equal(readGuestState(storage).watchlists[0].role,'owner');
});

test('guest add requires a quote and keeps the draft when the action fails',()=>{
  const storage=memory();
  let state=applyGuestAction(emptyGuestState(),{action:'createList'});
  writeGuestState(state,storage);
  assert.throws(()=>applyGuestAction(state,{action:'addStock',listId:state.watchlists[0].id,ticker:'AAPL',quantity:1}),/unavailable/);
  assert.equal(readGuestState(storage).watchlists[0].stocks.length,0);
});

test('guest rename and holdings survive import payload',()=>{
  const storage=memory();
  let state=applyGuestAction(emptyGuestState(),{action:'createList'});
  writeGuestState(state,storage);
  state=applyGuestAction(readGuestState(storage),{action:'renameList',listId:state.watchlists[0].id,name:'2027 AI Picks'});
  const quote={symbol:'NVDA',companyName:'NVIDIA',currency:'USD',exchange:'Nasdaq',price:120,quoteTime:'2026-09-11T20:00:00.000Z',checkedAt:'2026-09-11T20:00:00.000Z'};
  state=applyGuestAction(state,{action:'addStock',listId:state.watchlists[0].id,ticker:'NVDA',quantity:10,costPerShare:100,acquiredAt:'2026-01-02T00:00:00.000Z'},quote);
  writeGuestState(state,storage);
  const payload=guestImportPayload(readGuestState(storage));
  assert.equal(payload[0].name,'2027 AI Picks');
  assert.equal(payload[0].stocks[0].symbol,'NVDA');
  assert.equal(payload[0].stocks[0].quantity,10);
  assert.equal(payload[0].stocks[0].costPerShare,100);
});

test('guest workspace starts with an unnamed default list',async()=>{
  const {ensureGuestList}=await import('../lib/guest-watchlist.mjs');
  const storage=memory();
  const first=ensureGuestList(storage);
  const again=ensureGuestList(storage);
  assert.equal(first.watchlists.length,1);
  assert.equal(first.watchlists[0].name,'My watchlist');
  assert.equal(again.watchlists[0].id,first.watchlists[0].id);
  assert.equal(guestHasDraft(first),false);
});

test('guest lists lock to the first stock currency',()=>{
  const tr={symbol:'THYAO.IS',companyName:'THY',currency:'TRY',exchange:'Istanbul',price:300,quoteTime:'2026-09-11T20:00:00.000Z',checkedAt:'2026-09-11T20:00:00.000Z'};
  const us={symbol:'AAPL',companyName:'Apple',currency:'USD',exchange:'Nasdaq',price:190,quoteTime:'2026-09-11T20:00:00.000Z',checkedAt:'2026-09-11T20:00:00.000Z'};
  const eu={symbol:'ASML.AS',companyName:'ASML',currency:'EUR',exchange:'Amsterdam',price:800,quoteTime:'2026-09-11T20:00:00.000Z',checkedAt:'2026-09-11T20:00:00.000Z'};
  const eu2={symbol:'MC.PA',companyName:'LVMH',currency:'EUR',exchange:'Paris',price:700,quoteTime:'2026-09-11T20:00:00.000Z',checkedAt:'2026-09-11T20:00:00.000Z'};
  let state=applyGuestAction(emptyGuestState(),{action:'createList'});
  state=applyGuestAction(state,{action:'addStock',listId:state.watchlists[0].id,ticker:'THYAO.IS',quantity:10,costPerShare:300,acquiredAt:'2026-01-02T00:00:00.000Z'},tr);
  assert.throws(()=>applyGuestAction(state,{action:'addStock',listId:state.watchlists[0].id,ticker:'AAPL',quantity:1,costPerShare:190,acquiredAt:'2026-01-02T00:00:00.000Z'},us),/TRY only/);
  let europe=applyGuestAction(emptyGuestState(),{action:'createList'});
  europe=applyGuestAction(europe,{action:'addStock',listId:europe.watchlists[0].id,ticker:'ASML.AS',quantity:1,costPerShare:800,acquiredAt:'2026-01-02T00:00:00.000Z'},eu);
  europe=applyGuestAction(europe,{action:'addStock',listId:europe.watchlists[0].id,ticker:'MC.PA',quantity:1,costPerShare:700,acquiredAt:'2026-01-02T00:00:00.000Z'},eu2);
  assert.equal(europe.watchlists[0].stocks.length,2);
  const ca={symbol:'RY.TO',companyName:'RBC',currency:'CAD',exchange:'Toronto',price:140,quoteTime:'2026-09-11T20:00:00.000Z',checkedAt:'2026-09-11T20:00:00.000Z'};
  let canada=applyGuestAction(emptyGuestState(),{action:'createList'});
  canada=applyGuestAction(canada,{action:'addStock',listId:canada.watchlists[0].id,ticker:'RY.TO',quantity:1,costPerShare:140,acquiredAt:'2026-01-02T00:00:00.000Z'},ca);
  assert.throws(()=>applyGuestAction(canada,{action:'addStock',listId:canada.watchlists[0].id,ticker:'AAPL',quantity:1,costPerShare:190,acquiredAt:'2026-01-02T00:00:00.000Z'},us),/CAD only/);
});

test('guest workspaces allow one list and twenty stocks',()=>{
  let state=applyGuestAction(emptyGuestState(),{action:'createList'});
  assert.equal(state.plan.maxLists,1);
  assert.throws(()=>applyGuestAction(state,{action:'createList',name:'List 2'}),/free account/);
  const quote={symbol:'AAPL',companyName:'Apple',currency:'USD',exchange:'Nasdaq',price:190,quoteTime:'2026-09-11T20:00:00.000Z',checkedAt:'2026-09-11T20:00:00.000Z'};
  const listId=state.watchlists[0].id;
  for(let i=0;i<20;i++)state=applyGuestAction(state,{action:'addStock',listId,ticker:'T'+i,quantity:1,costPerShare:10,acquiredAt:'2026-01-02T00:00:00.000Z'},{...quote,symbol:'T'+i});
  assert.throws(()=>applyGuestAction(state,{action:'addStock',listId,ticker:'T20',quantity:1,costPerShare:10,acquiredAt:'2026-01-02T00:00:00.000Z'},{...quote,symbol:'T20'}),/Stock limit reached/);
});

test('guest refresh updates the last price and today’s change',()=>{
  const added={symbol:'IONQ',companyName:'IonQ',currency:'USD',exchange:'NYSE',price:38.14,quoteTime:'2026-09-05T16:00:00.000Z',checkedAt:'2026-09-05T16:00:00.000Z'};
  let state=applyGuestAction(emptyGuestState(),{action:'createList'});
  state=applyGuestAction(state,{action:'addStock',listId:state.watchlists[0].id,ticker:'IONQ'},added);
  state=applyGuestAction(state,{action:'refresh'},{IONQ:{symbol:'IONQ',companyName:'IonQ',currency:'USD',exchange:'NYSE',price:42.88,previousClose:40.74,changePercent:5.253,quoteTime:'2026-09-23T17:54:00.000Z',checkedAt:'2026-09-23T17:54:00.000Z'}});
  const stock=state.watchlists[0].stocks[0];
  assert.equal(stock.addedPrice,38.14);
  assert.equal(stock.currentPrice,42.88);
  assert.equal(stock.dayChangePercent,5.253);
  assert.equal(stock.previousClose,40.74);
});
test('guest can track a stock without inventing a share quantity',()=>{
  const quote={symbol:'AAPL',companyName:'Apple',currency:'USD',exchange:'Nasdaq',price:190,quoteTime:'2026-09-10T20:00:00.000Z',checkedAt:'2026-09-10T20:00:00.000Z'};
  let state=applyGuestAction(emptyGuestState(),{action:'createList'});
  state=applyGuestAction(state,{action:'addStock',listId:state.watchlists[0].id,ticker:'AAPL',notes:'Idea'},quote);
  const stock=state.watchlists[0].stocks[0];
  assert.equal(stock.quantity,null);
  assert.equal(stock.costPerShare,null);
  assert.equal(stock.acquiredAt,null);
  assert.equal(stock.addedPrice,190);
  assert.equal(stock.notes,'Idea');
});
