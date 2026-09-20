import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyShareCard,formatShareReturn,shareCard} from '../lib/share-card.mjs';

const stock=(over={})=>({symbol:'AAPL',currency:'USD',addedPrice:100,currentPrice:110,quantity:null,costPerShare:null,...over});

test('empty lists fall back to a shared-watchlist title',()=>{
  const card=emptyShareCard();
  assert.equal(card.name,'Shared watchlist');
  assert.equal(card.title,'Shared watchlist');
  assert.equal(card.returnLabel,null);
  assert.match(card.description,/shared watchlist/i);
});

test('title is list name plus return',()=>{
  const card=shareCard({name:'Tech 2027',stocks:[stock({currentPrice:112})]});
  assert.equal(card.title,'Tech 2027 · +12.0%');
  assert.equal(card.returnLabel,'+12.0%');
  assert.equal(card.tone,'up');
  assert.match(card.description,/Tech 2027 is \+12\.0% since tracking started/);
});

test('negative returns keep the minus and use down tone',()=>{
  const card=shareCard({name:'Banks',stocks:[stock({currentPrice:88})]});
  assert.equal(card.returnLabel,'-12.0%');
  assert.equal(card.tone,'down');
  assert.equal(card.title,'Banks · -12.0%');
});

test('large moves use one decimal',()=>assert.equal(formatShareReturn(12.46),'+12.5%'));

test('tickers collapse after five names',()=>{
  const stocks=['COST','NVDA','AAPL','MSFT','AMZN','META'].map(symbol=>stock({symbol,currentPrice:100}));
  const card=shareCard({name:'Mega',stocks});
  assert.equal(card.tickers,'COST · NVDA · AAPL · MSFT · AMZN · +1 more');
  assert.equal(card.countLabel,'6 stocks');
});

test('mixed currencies omit the return and keep the name',()=>{
  const card=shareCard({name:'Europe mix',stocks:[stock(),stock({symbol:'ASML.AS',currency:'EUR'})]});
  assert.equal(card.returnLabel,null);
  assert.equal(card.title,'Europe mix');
  assert.match(card.description,/2 stocks/);
});
