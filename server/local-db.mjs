import {PGlite} from '@electric-sql/pglite';
import {mkdir,readFile,readdir,writeFile,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {AppError} from './quotes.mjs';
export function localMode(){
  let host;try{host=new URL(process.env.APP_URL||'http://127.0.0.1:4317').hostname;}catch{return false;}
  return process.env.LOCAL_AUTH_ENABLED==='true'&&['127.0.0.1','localhost','[::1]'].includes(host);
}
const root=()=>resolve(process.env.LOCAL_DATA_DIR||'data');
const state=globalThis[Symbol.for('watch-list.local-db')]??={pending:null,closing:false};
export async function closeLocalDatabase(){if(state.closing)return;state.closing=true;try{const pg=await state.pending;if(pg&&!pg.closed)await pg.close();}finally{state.pending=null;state.closing=false;}}
if(!state.handlers){state.handlers=true;for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void closeLocalDatabase().finally(()=>process.exit(0));});}
export async function localPg(){
 if(!localMode())throw new AppError('Local accounts are disabled.',404);
 return state.pending??=(async()=>{
  await mkdir(root(),{recursive:true,mode:0o700});
  const pg=new PGlite(join(root(),'accounts.pg'));await pg.waitReady;
  await pg.exec(`create table if not exists public.local_migrations(name text primary key);`);
  const existing=(await pg.query('select name from local_migrations')).rows.map(r=>r.name);
  if(!existing.length)await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  for(const file of (await readdir(resolve('supabase/migrations'))).filter(f=>f.endsWith('.sql')).sort())if(!existing.includes(file)){
   await pg.exec(await readFile(resolve('supabase/migrations',file),'utf8'));await pg.query('insert into local_migrations values($1)',[file]);
  }
  await pg.exec(`create table if not exists local_users(id uuid primary key references auth.users(id),email text unique not null,password_hash text not null,name text not null,verified_at timestamptz,created_at timestamptz default now());
   create table if not exists local_sessions(token_hash text primary key,user_id uuid references local_users(id) on delete cascade,expires_at timestamptz not null);
   create table if not exists local_tokens(token_hash text primary key,user_id uuid references local_users(id) on delete cascade,kind text not null,expires_at timestamptz not null);`);
  return pg;
 })().catch(e=>{state.pending=null;throw e;});
}
const identifier=s=>{if(!/^[a-z_][a-z0-9_]*$/.test(s))throw Error('Invalid database identifier');return '"'+s+'"';};
const clean=value=>JSON.parse(JSON.stringify(value));
class Query{
 constructor(table){if(!table.startsWith('wl_'))throw Error('Invalid table');this.table=identifier(table);this.filters=[];this.orders=[];this.columns='*';this.kind='select';}
 select(columns='*'){this.columns=columns==='*'?'*':columns.split(',').map(identifier).join(',');return this;}
 eq(column,value){this.filters.push([column,'=',value]);return this;}
 is(column,value){if(value!==null)throw Error('Only null supported');this.filters.push([column,'is',null]);return this;}
 in(column,values){this.filters.push([column,'in',values]);return this;}
 order(column){this.orders.push(identifier(column));return this;}
 update(data){this.kind='update';this.payload=data;return this;}
 upsert(data){this.kind='upsert';this.payload=data;return this;}
 single(){this.one=true;this.required=true;return this;}
 maybeSingle(){this.one=true;return this;}
 async execute(){try{
  const pg=await localPg(),params=[];const bind=v=>{params.push(v&&typeof v==='object'?JSON.stringify(v):v);return '$'+params.length;};
  const where=this.filters.map(([c,op,v])=>op==='in'?`${identifier(c)} in (${v.length?v.map(bind).join(','):'null'})`:op==='is'?`${identifier(c)} is null`:`${identifier(c)}=${bind(v)}`).join(' and ');
  let sql;
  if(this.kind==='select')sql=`select ${this.columns} from ${this.table}${where?' where '+where:''}${this.orders.length?' order by '+this.orders.join(','):''}`;
  else if(this.kind==='update')sql=`update ${this.table} set ${Object.entries(this.payload).map(([k,v])=>identifier(k)+'='+bind(v)).join(',')}${where?' where '+where:''} returning *`;
  else{const keys=Object.keys(this.payload);sql=`insert into ${this.table} (${keys.map(identifier).join(',')}) values (${keys.map(k=>bind(this.payload[k])).join(',')}) on conflict (symbol) do update set ${keys.filter(k=>k!=='symbol').map(k=>identifier(k)+'=excluded.'+identifier(k)).join(',')} returning *`;}
  const rows=clean((await pg.query(sql,params)).rows);if(this.required&&rows.length!==1)throw Error('Row not found');return {data:this.one?rows[0]||null:rows,error:null};
 }catch(e){return {data:null,error:{message:e.message,code:e.code}};}}
 then(a,b){return this.execute().then(a,b);}
}
export const localDatabase=()=>({from:table=>new Query(table),rpc:async(name,args={})=>{try{const pg=await localPg();const entries=Object.entries(args);const sql=`select ${identifier(name)}(${entries.map(([k],i)=>identifier(k)+' => $'+(i+1)).join(',')}) as result`;const data=(await pg.query(sql,entries.map(([,v])=>v&&typeof v==='object'?JSON.stringify(v):v))).rows[0].result;return {data:clean(data??null),error:null};}catch(e){return {data:null,error:{code:e.code,message:e.message}};}}});
let exportQueue=Promise.resolve();
export function exportLocalData(){exportQueue=exportQueue.catch(()=>{}).then(async()=>{await persistLocalDatabase();const pg=await localPg();const [lists,stocks]=await Promise.all(['wl_watchlists','wl_stocks'].map(t=>pg.query('select * from '+t)));const data={version:3,exportedAt:new Date().toISOString(),watchlists:lists.rows.map(l=>({...l,stocks:stocks.rows.filter(s=>s.watchlist_id===l.id)}))};const target=join(root(),'watchlists-export.json');await writeFile(target+'.tmp',JSON.stringify(data,null,2),{mode:0o600});await rename(target+'.tmp',target);});return exportQueue;}

// Keep a private logical snapshot as well as flushing PostgreSQL pages to disk.
let snapshotQueue=Promise.resolve();
export function persistLocalDatabase(){snapshotQueue=snapshotQueue.catch(()=>{}).then(async()=>{const pg=await localPg();await pg.exec('checkpoint');const tables=['auth.users','public.local_users','public.local_sessions','public.local_tokens','public.wl_profiles','public.wl_watchlists','public.wl_stocks','public.wl_quotes','public.wl_stripe_events','public.wl_rate_limits'];const snapshot={version:1,savedAt:new Date().toISOString(),tables:{}};await pg.transaction(async tx=>{for(const table of tables)snapshot.tables[table]=(await tx.query('select * from '+table)).rows;});const target=join(root(),'accounts-recovery.json');await writeFile(target+'.tmp',JSON.stringify(snapshot),{mode:0o600});await rename(target+'.tmp',target);});return snapshotQueue;}
