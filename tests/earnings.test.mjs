import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEarnings,earningsForRequest} from '../server/earnings.mjs';
const request=new Request('http://127.0.0.1:4317/api/stocks/AMZN/earnings');
const auth=profile=>async()=>({user:{id:'member'},db:{from(){return {select(){return this;},eq(){return this;},async single(){return {data:profile};}};},async rpc(){return {data:true};}}});
test('quarterly reports exclude annual, empty and future periods and keep six latest unique quarters',()=>{
 const rows=Array.from({length:8},(_,i)=>({date:new Date(Date.UTC(2023,3*i,28)),periodType:'3M',totalRevenue:100+i,netIncome:i===7?-10:20,dilutedEPS:0}));
 rows.push({...rows[7],totalRevenue:undefined,netIncome:undefined,dilutedEPS:2},{date:'2099-01-01',periodType:'3M',totalRevenue:50},{date:'2025-12-31',periodType:'12M',totalRevenue:500},{date:'2025-06-30',periodType:'3M'});
 const data=normalizeEarnings(rows,Date.parse('2026-01-01'));assert.equal(data.length,6);assert.equal(data[5].revenue,107);assert.equal(data[5].netIncome,-10);assert.equal(data[5].eps,2);assert.equal(data[4].eps,0);
});
test('anonymous and Basic members cannot retrieve earnings, including through the direct endpoint service',async()=>{
 let fetched=false;const load=async()=>{fetched=true;return {};};
 await assert.rejects(earningsForRequest(request,'AMZN',{authenticate:async()=>{throw Object.assign(Error('Sign in'),{status:401});},load}),e=>e.status===401);
 for(const p of [{subscription_status:'free'},{subscription_status:'active',pro_until:'2020-01-01'}])await assert.rejects(earningsForRequest(request,'AMZN',{authenticate:auth(p),load}),e=>e.status===403);
 assert.equal(fetched,false);
});
test('active Pro and admin accounts can retrieve earnings; invalid symbols never reach provider',async()=>{
 for(const p of [{subscription_status:'active',pro_until:'2099-01-01'},{is_admin:true}]){const result=await earningsForRequest(request,'amzn',{authenticate:auth(p),load:async symbol=>({symbol})});assert.equal(result.symbol,'AMZN');}
 await assert.rejects(earningsForRequest(request,'../../secret',{authenticate:auth({is_admin:true}),load:async()=>assert.fail('Invalid symbol reached provider')}));
});
