import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const user='11111111-1111-4111-8111-111111111111';
const quote=(symbol,currency='USD')=>({symbol,companyName:symbol,currency,price:100,exchange:'Test',quoteTime:'2026-09-11T20:00:00.000Z',checkedAt:'2026-09-11T20:00:00.000Z'});
let db;

before(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
  await db.query('insert into auth.users values($1)',[user]);
  await db.query('select wl_ensure_profile($1,$2,0)',[user,'Member']);
  await db.query("update wl_profiles set subscription_status='active',pro_until=now()+interval '1 year' where id=$1",[user]);
});
after(async()=>{await db?.close();});

test('a Turkish list rejects US stocks and a euro list accepts other euro stocks',async()=>{
  const id=(await db.query('select id from wl_watchlists where owner_id=$1',[user])).rows[0].id;
  await db.query("select wl_advanced_action($1,'addStock',$2,p_symbol=>'THYAO.IS',p_quote=>$3,p_quantity=>10,p_cost=>300,p_acquired=>'2026-01-02')",[user,id,JSON.stringify(quote('THYAO.IS','TRY'))]);
  await assert.rejects(db.query("select wl_advanced_action($1,'addStock',$2,p_symbol=>'AAPL',p_quote=>$3,p_quantity=>1,p_cost=>190,p_acquired=>'2026-01-02')",[user,id,JSON.stringify(quote('AAPL','USD'))]),/TRY only/);
  await db.query("select wl_advanced_action($1,'createList',p_name=>'Europe')",[user]);
  const europe=(await db.query("select id from wl_watchlists where owner_id=$1 and name='Europe'",[user])).rows[0].id;
  await db.query("select wl_advanced_action($1,'addStock',$2,p_symbol=>'ASML.AS',p_quote=>$3,p_quantity=>1,p_cost=>800,p_acquired=>'2026-01-02')",[user,europe,JSON.stringify(quote('ASML.AS','EUR'))]);
  await db.query("select wl_advanced_action($1,'addStock',$2,p_symbol=>'MC.PA',p_quote=>$3,p_quantity=>1,p_cost=>700,p_acquired=>'2026-01-02')",[user,europe,JSON.stringify(quote('MC.PA','EUR'))]);
  assert.equal((await db.query('select count(*)::int n from wl_stocks where watchlist_id=$1',[europe])).rows[0].n,2);
  await db.query("select wl_advanced_action($1,'createList',p_name=>'Canada')",[user]);
  const canada=(await db.query("select id from wl_watchlists where owner_id=$1 and name='Canada'",[user])).rows[0].id;
  await db.query("select wl_advanced_action($1,'addStock',$2,p_symbol=>'RY.TO',p_quote=>$3,p_quantity=>1,p_cost=>140,p_acquired=>'2026-01-02')",[user,canada,JSON.stringify(quote('RY.TO','CAD'))]);
  await assert.rejects(db.query("select wl_advanced_action($1,'addStock',$2,p_symbol=>'AAPL',p_quote=>$3,p_quantity=>1,p_cost=>190,p_acquired=>'2026-01-02')",[user,canada,JSON.stringify(quote('AAPL','USD'))]),/CAD only/);
});
