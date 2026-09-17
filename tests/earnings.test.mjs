import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEarnings,earningsForRequest} from '../server/earnings.mjs';
const request=new Request('http://127.0.0.1:4317/api/stocks/AMZN/earnings');
test('quarterly reports exclude annual, empty and future periods and keep six latest unique quarters',()=>{
 const rows=Array.from({length:8},(_,i)=>({date:new Date(Date.UTC(2023,3*i,28)),periodType:'3M',totalRevenue:100+i,netIncome:i===7?-10:20,dilutedEPS:0}));
 rows.push({...rows[7],totalRevenue:undefined,netIncome:undefined,dilutedEPS:2},{date:'2099-01-01',periodType:'3M',totalRevenue:50},{date:'2025-12-31',periodType:'12M',totalRevenue:500},{date:'2025-06-30',periodType:'3M'});
 const data=normalizeEarnings(rows,Date.parse('2026-01-01'));assert.equal(data.length,6);assert.equal(data[5].revenue,107);assert.equal(data[5].netIncome,-10);assert.equal(data[5].eps,2);assert.equal(data[4].eps,0);
});
test('earnings are available without a paid plan; invalid symbols never reach provider',async()=>{
 const result=await earningsForRequest(request,'amzn',{load:async symbol=>({symbol})});assert.equal(result.symbol,'AMZN');
 await assert.rejects(earningsForRequest(request,'../../secret',{load:async()=>assert.fail('Invalid symbol reached provider')}));
});
