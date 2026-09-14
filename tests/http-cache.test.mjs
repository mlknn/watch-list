import test from 'node:test';
import assert from 'node:assert/strict';
import {json,publicJson,publicRate} from '../server/http.mjs';
import {AppError} from '../server/quotes.mjs';

test('private JSON responses are not cached',()=>{
  const headers=json({ok:true}).headers;
  assert.match(headers.get('cache-control')||'',/no-store/);
  assert.equal(headers.get('x-content-type-options'),'nosniff');
});

test('public JSON responses allow a short CDN cache without storing in the browser',()=>{
  const headers=publicJson({ok:true},15).headers;
  assert.equal(headers.get('cache-control'),'public, max-age=0, s-maxage=15, stale-while-revalidate=60');
});

test('public rate limits use Cloudflare IP, not spoofable X-Forwarded-For',()=>{
  const key='xff-'+Math.random();
  const a=new Request('https://stockwatchlist.app/x',{headers:{'cf-connecting-ip':'1.1.1.1','x-forwarded-for':'8.8.8.8'}});
  const b=new Request('https://stockwatchlist.app/x',{headers:{'cf-connecting-ip':'1.1.1.1','x-forwarded-for':'9.9.9.9'}});
  for(let i=0;i<80;i++)publicRate(a,key,80,60);
  assert.throws(()=>publicRate(b,key,80,60),e=>e instanceof AppError&&e.status===429);
});
