import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEps,epsSurprise,formatEps,formatSurprise,weekRangeLabel,capMatch,matchesQuery,filterEarningsRows,summaryCounts} from '../lib/earnings-compare.mjs';

test('EPS strings parse dollars, negatives, and blanks',()=>{
  assert.equal(parseEps('$0.92'),0.92);
  assert.equal(parseEps('($0.12)'),-0.12);
  assert.equal(parseEps('-$1.00'),-1);
  assert.equal(parseEps('$0.00'),0);
  assert.equal(parseEps(''),null);
  assert.equal(parseEps('—'),null);
});

test('surprise is omitted when either side is missing',()=>{
  assert.equal(epsSurprise('$1.00','').difference,null);
  assert.equal(epsSurprise('','$1.00').percent,null);
});

test('zero estimate shows a dollar difference, not a percent',()=>{
  const result=epsSurprise('$0.20','$0.00');
  assert.equal(result.difference,0.2);
  assert.equal(result.percent,null);
  assert.equal(result.tone,'above');
  assert.equal(formatSurprise(result),'+$0.20');
});

test('in-line means the surprise is under one percent',()=>{
  assert.equal(epsSurprise('$1.004','$1.00').tone,'inline');
  assert.equal(epsSurprise('$1.20','$1.00').tone,'above');
  assert.equal(epsSurprise('$0.80','$1.00').tone,'below');
});

test('week labels follow the product date format',()=>{
  assert.equal(weekRangeLabel('2026-09-21','2026-09-25'),'Sep 21–25, 2026');
  assert.equal(weekRangeLabel('2026-09-28','2026-10-02'),'Sep 28–Oct 2, 2026');
});

test('market-cap and search filters keep comparable rows',()=>{
  assert.equal(capMatch(8e9,'1-10'),true);
  assert.equal(capMatch(8e9,'10-50'),false);
  assert.equal(matchesQuery({symbol:'AAPL',name:'Apple Inc.'},'app'),true);
  assert.equal(matchesQuery({symbol:'MSFT',name:'Microsoft'},'app'),false);
});

test('formatted EPS keeps two decimals',()=>{
  assert.equal(formatEps('$1.2'),'$1.20');
  assert.equal(formatEps('($0.4)'),'-$0.40');
});

test('filters apply the same rules to calendar and table rows',()=>{
  const rows=[
    {symbol:'AAPL',name:'Apple',when:'bmo',reported:false,eps:'',epsForecast:'$1.10',marketCap:3e12,date:'2026-09-23'},
    {symbol:'COST',name:'Costco',when:'amc',reported:true,eps:'$4.20',epsForecast:'$4.00',marketCap:4e11,date:'2026-09-21'},
  ];
  assert.equal(filterEarningsRows(rows,'cos','','',false,new Set(),'').map(row=>row.symbol).join(),'COST');
  assert.equal(filterEarningsRows(rows,'','amc','',false,new Set(),'').length,1);
  assert.equal(filterEarningsRows(rows,'','','reported',false,new Set(),'').map(row=>row.symbol).join(),'COST');
  assert.equal(filterEarningsRows(rows,'','','',true,new Set(['AAPL']),'200+').map(row=>row.symbol).join(),'AAPL');
});

test('today is zero when the selected week does not include today',()=>{
  const rows=[{symbol:'AAPL',date:'2026-09-23',reported:true}];
  const away=summaryCounts(rows,'2026-09-30','2026-09-21','2026-09-25',new Set());
  assert.equal(away.today,0);
  assert.equal(away.week,1);
  assert.equal(away.reported,1);
  assert.equal(summaryCounts(rows,'2026-09-23','2026-09-21','2026-09-25',new Set(['AAPL'])).today,1);
});
