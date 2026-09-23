import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteFromChart} from '../server/quotes.mjs';

test('quote uses the live regular-session price and today’s change versus prior close',()=>{
  const quote=quoteFromChart({
    chart:{
      result:[{
        meta:{
          currency:'USD',
          symbol:'IONQ',
          regularMarketPrice:42.88,
          regularMarketTime:1790186091,
          regularMarketChangePercent:5.253,
          previousClose:40.74,
          chartPreviousClose:40.74,
          longName:'IonQ, Inc.',
          shortName:'IonQ, Inc.',
          fullExchangeName:'NYSE',
        },
      }],
      error:null,
    },
  },'IONQ');
  assert.equal(quote.price,42.88);
  assert.equal(quote.previousClose,40.74);
  assert.equal(quote.changePercent,5.253);
  assert.equal(quote.quoteTime,'2026-09-23T17:54:51.000Z');
});

test('quote falls back to chart previous close when regular previous close is missing',()=>{
  const quote=quoteFromChart({
    chart:{
      result:[{
        meta:{
          currency:'USD',
          symbol:'TSLA',
          regularMarketPrice:379.5,
          regularMarketTime:1790186045,
          chartPreviousClose:378.9,
          longName:'Tesla, Inc.',
          shortName:'Tesla, Inc.',
          fullExchangeName:'NasdaqGS',
        },
      }],
      error:null,
    },
  },'TSLA');
  assert.equal(quote.previousClose,378.9);
  assert.equal(Math.round(quote.changePercent*1000)/1000,0.158);
});
