import test from 'node:test';
import assert from 'node:assert/strict';
import {browserSupabaseKey} from '../server/cloud.mjs';

function jwt(role){
  const header=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify({role,iss:'supabase'})).toString('base64url');
  return `${header}.${payload}.sig`;
}

test('browser config never returns a service_role key',()=>{
  assert.equal(browserSupabaseKey(jwt('anon')),jwt('anon'));
  assert.equal(browserSupabaseKey(jwt('service_role')),'');
  assert.equal(browserSupabaseKey('sb_publishable_demo'),'sb_publishable_demo');
  assert.equal(browserSupabaseKey(''),'');
});
