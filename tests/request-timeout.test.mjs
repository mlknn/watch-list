import test from 'node:test';
import assert from 'node:assert/strict';
import {withTimeout,publicDataJson} from '../lib/request-timeout.mjs';
test('bounds work that ignores abort and stalled JSON bodies',async()=>{
 await assert.rejects(withTimeout(()=>new Promise(()=>{}),10),/too long/);
 await assert.rejects(publicDataJson('/test',{milliseconds:10,fetcher:async()=>({ok:true,json:()=>new Promise(()=>{})})}),/too long/);
});
test('preserves errors, success and aborts completed fetch signals',async()=>{
 let signal;assert.deepEqual(await publicDataJson('/test',{fetcher:async(_,options)=>{signal=options.signal;return {ok:true,json:async()=>({ok:true})};}}),{ok:true});assert.equal(signal.aborted,true);
 await assert.rejects(publicDataJson('/test',{fetcher:async()=>({ok:false,json:async()=>({error:'Rate limited'})})}),/Rate limited/);
});
