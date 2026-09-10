import {test,before,after} from 'node:test';import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
let db;
before(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
  await db.query('insert into auth.users values($1),($2)',[A,B]);
  for(const id of [A,B])await db.query('select wl_ensure_profile($1,$2,0)',[id,'Member']);
});
after(async()=>{await db?.close();});
test('dashboard favorites are per account and capped',async()=>{
  await db.query("select wl_favorite_action($1,'add','AAPL')",[A]);
  await db.query("select wl_favorite_action($1,'add','MSFT')",[A]);
  await db.query("select wl_favorite_action($1,'add','AAPL')",[A]);
  assert.equal((await db.query('select count(*)::int n from wl_dashboard_favorites where user_id=$1',[A])).rows[0].n,2);
  await db.query("select wl_favorite_action($1,'remove','MSFT')",[A]);
  assert.equal((await db.query('select symbol from wl_dashboard_favorites where user_id=$1',[A])).rows[0].symbol,'AAPL');
  assert.equal((await db.query('select count(*)::int n from wl_dashboard_favorites where user_id=$1',[B])).rows[0].n,0);
  for(let i=0;i<29;i++)await db.query("select wl_favorite_action($1,'add',$2)",[A,'S'+i]);
  await assert.rejects(db.query("select wl_favorite_action($1,'add','OVER')",[A]),/up to 30/);
});
test('authenticated users cannot read another account’s dashboard favorites',async()=>{
  await db.exec('set role authenticated');
  try{
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[B]);
    assert.equal((await db.query('select * from wl_dashboard_favorites')).rows.length,0);
    await assert.rejects(db.query("select wl_favorite_action($1,'add','TSLA')",[B]),/permission denied/);
  }finally{await db.exec('reset role');}
});
