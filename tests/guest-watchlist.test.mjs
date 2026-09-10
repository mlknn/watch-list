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

test('guest add requires a quote and keeps the draft when the action fails',()=>{
  const storage=memory();
  let state=applyGuestAction(emptyGuestState(),{action:'createList'});
  writeGuestState(state,storage);
  assert.throws(()=>applyGuestAction(state,{action:'addStock',listId:state.watchlists[0].id,ticker:'AAPL',quantity:1}),/unavailable/);
  assert.equal(readGuestState(storage).watchlists[0].stocks.length,0);
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
