import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyMove,newsMentionsSymbol,normalizeNews,yahooNewsLink} from '../lib/daily-move.mjs';

const quote=overrides=>({
  price:100,previousClose:98,change:2,changePercent:2.04,open:99,dayLow:98.5,dayHigh:101,
  fiftyTwoWeekLow:70,fiftyTwoWeekHigh:120,...overrides,
});

test('daily move names the up or down print versus the previous close',()=>{
  const up=dailyMove({companyName:'Wells Fargo',symbol:'WFC',quote:quote()});
  assert.equal(up.direction,'up');
  assert.equal(up.lines[0].key,'{name} is up {pct}% today versus the previous close.');
  assert.equal(up.lines[0].vars.pct,'2.04');
  const down=dailyMove({companyName:'Wells Fargo',symbol:'WFC',quote:quote({price:96,change:-2,changePercent:-2.04,open:97,dayLow:95.5,dayHigh:98})});
  assert.equal(down.direction,'down');
  assert.match(down.lines[0].key,/is down/);
});

test('daily move describes fade versus recovery from the open',()=>{
  const faded=dailyMove({companyName:'Wells Fargo',quote:quote({price:97,previousClose:96,change:1,changePercent:1.04,open:99,dayLow:96.8,dayHigh:99.2})});
  assert.ok(faded.lines.some(line=>line.key==='It opened higher, then faded below the open.'));
  const recovered=dailyMove({companyName:'Wells Fargo',quote:quote({price:97,previousClose:100,change:-3,changePercent:-3,open:96,dayLow:95.5,dayHigh:97.4})});
  assert.ok(recovered.lines.some(line=>line.key==='It opened lower, then recovered above the open.'));
});

test('daily move flags earnings on the New York calendar day',()=>{
  const now=Date.parse('2026-09-22T16:00:00-04:00');
  const move=dailyMove({companyName:'Wells Fargo',quote:quote()},{earningsDate:'2026-09-22T20:00:00.000Z'},now);
  assert.ok(move.lines.some(line=>line.key==='Earnings are scheduled today.'));
});

test('Yahoo news links stay on yahoo.com and drop stale or unrelated stories',()=>{
  assert.equal(yahooNewsLink('https://finance.yahoo.com/news/wells-fargo-slides-123.html'),'https://finance.yahoo.com/news/wells-fargo-slides-123.html');
  assert.equal(yahooNewsLink('javascript:alert(1)'),'');
  assert.equal(yahooNewsLink('https://evil.example/news'),'');
  assert.equal(newsMentionsSymbol({relatedTickers:['JPM']},'WFC'),false);
  assert.equal(newsMentionsSymbol({relatedTickers:['WFC','BAC']},'WFC'),true);
  const now=Date.parse('2026-09-22T16:00:00-04:00');
  const items=normalizeNews([
    {title:'Wells Fargo slips after fees',link:'https://finance.yahoo.com/news/wfc-1',publisher:'Reuters',providerPublishTime:now/1000,relatedTickers:['WFC']},
    {title:'Old story',link:'https://finance.yahoo.com/news/old',publisher:'AP',providerPublishTime:(now/1000)-300000,relatedTickers:['WFC']},
    {title:'Other bank',link:'https://finance.yahoo.com/news/jpm',publisher:'Bloomberg',providerPublishTime:now/1000,relatedTickers:['JPM']},
  ],now,72,'WFC');
  assert.equal(items.length,1);
  assert.equal(items[0].sameDay,true);
  assert.match(items[0].title,/Wells Fargo/);
});

test('market-moving Yahoo headlines outrank same-day press releases',()=>{
  const now=Date.parse('2026-09-22T16:00:00-04:00');
  const items=normalizeNews([
    {title:'Wells Fargo sponsors a housing tour',link:'https://finance.yahoo.com/news/pr',publisher:'ACCESS',providerPublishTime:now/1000,relatedTickers:['WFC']},
    {title:'Wells Fargo slides after outlook cut',link:'https://finance.yahoo.com/news/move',publisher:'Reuters',providerPublishTime:(now/1000)-600,relatedTickers:['WFC']},
  ],now,72,'WFC');
  assert.equal(items[0].title,'Wells Fargo slides after outlook cut');
});
