import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {visitorHash,canViewAnalytics} from '../server/analytics.mjs';

const A='11111111-1111-4111-8111-111111111111';
let db;

before(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
});
after(async()=>{await db?.close();});

test('analytics counts unique visitors separately from repeat events',async()=>{
  const one=visitorHash('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const two=visitorHash('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  await db.query('select wl_analytics_track($1,$2)',['visit',one]);
  await db.query('select wl_analytics_track($1,$2)',['visit',one]);
  await db.query('select wl_analytics_track($1,$2)',['dashboard',one]);
  await db.query('select wl_analytics_track($1,$2)',['stock_search',two]);
  await db.query('select wl_analytics_track($1,$2)',['watchlist_created',two]);
  const summary=(await db.query('select wl_analytics_summary(14) as days')).rows[0].days;
  const today=summary[0];
  assert.equal(today.visit.unique,1);
  assert.equal(today.visit.total,2);
  assert.equal(today.dashboard.unique,1);
  assert.equal(today.stock_search.unique,1);
  assert.equal(today.watchlist_created.unique,1);
  assert.equal(today.signup.unique,0);
});

test('analytics access follows ANALYTICS_EMAILS',()=>{
  const previous=process.env.ANALYTICS_EMAILS;
  try{
    process.env.ANALYTICS_EMAILS='owner@example.com,ops@example.com';
    assert.equal(canViewAnalytics('owner@example.com'),true);
    assert.equal(canViewAnalytics('OPS@example.com'),true);
    assert.equal(canViewAnalytics('other@example.com'),false);
    assert.equal(canViewAnalytics(''),false);
    process.env.ANALYTICS_EMAILS='';
    assert.equal(canViewAnalytics('owner@example.com'),false);
  }finally{
    if(previous===undefined)delete process.env.ANALYTICS_EMAILS;
    else process.env.ANALYTICS_EMAILS=previous;
  }
});

test('new profiles count as a signup once',async()=>{
  await db.query('insert into auth.users values($1)',[A]);
  await db.query('select wl_ensure_profile($1,$2,0)',[A,'Member']);
  await db.query('select wl_ensure_profile($1,$2,0)',[A,'Member']);
  const today=(await db.query('select wl_analytics_summary(1) as days')).rows[0].days[0];
  assert.equal(today.signup.unique,1);
  assert.equal(today.signup.total,1);
});
