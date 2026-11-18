import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
let db;const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const quote={symbol:'TEST',companyName:'Test company',currency:'USD',price:100,quoteTime:'2026-01-01T00:00:00Z'};
void before(async()=>{db=new PGlite();await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select null::uuid$$;");for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
 if(file==='202611180001_position_orders.sql'){
  const legacy='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  await db.query('insert into auth.users values($1)',[legacy]);
  await db.query('select wl_ensure_profile($1,$2,0)',[legacy,'Legacy']);
  const list=(await db.query('select id from wl_watchlists where owner_id=$1',[legacy])).rows[0].id;
  await db.query("select wl_advanced_action($1,'addStock',$2,p_symbol=>'MIGRATED',p_quote=>$3,p_quantity=>100,p_cost=>10,p_acquired=>now())",[legacy,list,JSON.stringify({...quote,symbol:'MIGRATED'})]);
 }
 await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
} for(const id of [a,b]){await db.query('insert into auth.users values($1)',[id]);await db.query('select wl_ensure_profile($1,$2,0)',[id,'Member']);}await db.query("update wl_profiles set subscription_status='active',pro_until=now()+interval '1 year' where id=$1",[b]);});
void after(async()=>{await db.close();});
void test('both Basic and Pro save quantities and prohibit later changes at the database level',async()=>{for(const id of [a,b]){const list=(await db.query('select * from wl_watchlists where owner_id=$1',[id])).rows[0];assert.equal(list.mode,'advanced');await db.query("select wl_advanced_action($1,'addStock',$2,p_symbol=>'TEST',p_quote=>$3,p_quantity=>100,p_cost=>100,p_acquired=>now())",[id,list.id,JSON.stringify(quote)]);const stock=(await db.query('select * from wl_stocks where watchlist_id=$1',[list.id])).rows[0];assert.equal(Number(stock.quantity),100);await assert.rejects(db.query("select wl_advanced_action($1,'updatePosition',$2,p_stock=>$3,p_quantity=>200,p_cost=>100,p_acquired=>now())",[id,list.id,stock.id]),/fixed/);await assert.rejects(db.query('update wl_stocks set quantity=200 where id=$1',[stock.id]),/fixed/);await assert.rejects(db.query("select wl_advanced_action($1,'initializePosition',$2,p_stock=>$3,p_quantity=>200,p_cost=>100,p_acquired=>now())",[id,list.id,stock.id]),/already been set/);}});
void test('legacy quantities can be initialized exactly once by the owner',async()=>{const list=(await db.query('select id from wl_watchlists where owner_id=$1',[a])).rows[0].id;const legacy={...quote,symbol:'OLD'};await db.query("select wl_account_action($1,'addStock',$2,p_symbol=>'OLD',p_quote=>$3)",[a,list,JSON.stringify(legacy)]);const stock=(await db.query("select id from wl_stocks where symbol='OLD'")).rows[0].id;await assert.rejects(db.query("select wl_advanced_action($1,'initializePosition',$2,p_stock=>$3,p_quantity=>20,p_cost=>100,p_acquired=>now())",[b,list,stock]),/do not own/);await db.query("select wl_advanced_action($1,'initializePosition',$2,p_stock=>$3,p_quantity=>20,p_cost=>100,p_acquired=>now())",[a,list,stock]);await assert.rejects(db.query("select wl_advanced_action($1,'initializePosition',$2,p_stock=>$3,p_quantity=>30,p_cost=>100,p_acquired=>now())",[a,list,stock]),/already been set/);});
void test('additional orders retain the first purchase and expose aggregate totals',async()=>{
 const list=(await db.query('select id from wl_watchlists where owner_id=$1',[a])).rows[0].id;
 const stock=(await db.query("select * from wl_stocks where watchlist_id=$1 and symbol='TEST'",[list])).rows[0];
 await db.query("select wl_advanced_action($1,'addOrder',$2,p_stock=>$3,p_quantity=>100,p_cost=>150,p_acquired=>now())",[a,list,stock.id]);
 await db.query("select wl_advanced_action($1,'addStock',$2,p_symbol=>'TEST',p_quote=>$3,p_quantity=>50,p_cost=>200,p_acquired=>now())",[a,list,JSON.stringify(quote)]);
 const saved=(await db.query('select * from wl_stocks where id=$1',[stock.id])).rows[0];
 assert.equal(Number(saved.quantity),100);assert.deepEqual(saved.orders.map(o=>o.id),[1,2,3]);
 const {stockView}=await import('../server/cloud.mjs');const view=stockView(saved);
 assert.equal(view.quantity,250);assert.equal(view.costPerShare,140);
 await assert.rejects(db.query("select wl_advanced_action($1,'addOrder',$2,p_stock=>$3,p_quantity=>1,p_cost=>10,p_acquired=>now())",[b,list,stock.id]),/do not own/);
 await assert.rejects(db.query("select wl_advanced_action($1,'addOrder',$2,p_stock=>$3,p_quantity=>-1,p_cost=>10,p_acquired=>now())",[a,list,stock.id]),/positive/);
});

void test('migration backfills existing holdings as order 1',async()=>{
 const stock=(await db.query("select * from wl_stocks where symbol='MIGRATED'")).rows[0];
 assert.equal(stock.orders.length,1);assert.equal(stock.orders[0].id,1);
 assert.equal(stock.orders[0].quantity,100);assert.equal(stock.orders[0].costPerShare,10);
});
