import test from 'node:test';
import assert from 'node:assert/strict';
import {json,publicJson} from '../server/http.mjs';

test('private JSON responses are not cached',()=>{
  const headers=json({ok:true}).headers;
  assert.match(headers.get('cache-control')||'',/no-store/);
  assert.equal(headers.get('x-content-type-options'),'nosniff');
});

test('public JSON responses allow a short CDN cache without storing in the browser',()=>{
  const headers=publicJson({ok:true},15).headers;
  assert.equal(headers.get('cache-control'),'public, max-age=0, s-maxage=15, stale-while-revalidate=60');
});
