import {localMode,localDatabase,exportLocalData} from './local-db.mjs';
import {localUser} from './local-auth.mjs';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import {canViewAnalytics} from './analytics-access.mjs';
import { AppError, getQuote, normalizeTicker } from './quotes.mjs';
import {assertQuoteCurrency} from '../lib/portfolio-currency.mjs';
import {OPEN_PLAN} from '../lib/plan.mjs';

export const authConfigured = () => localMode() || !!(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
function jwtPayload(token){
  const parts=String(token||'').split('.');
  if(parts.length!==3)return null;
  try{
    const pad=parts[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(Buffer.from(pad+'='.repeat((4-pad.length%4)%4),'base64').toString('utf8'));
  }catch{return null;}
}
/** Browser-safe anon/publishable key only. Never return a service_role JWT. */
export function browserSupabaseKey(key=process.env.SUPABASE_PUBLISHABLE_KEY||''){
  const raw=String(key||'').trim();
  if(!raw||/service_role/i.test(raw))return '';
  const payload=jwtPayload(raw);
  if(payload&&payload.role&&payload.role!=='anon'&&payload.role!=='authenticated')return '';
  if(payload===null&&raw.split('.').length===3)return '';
  return raw;
}
export const origin = () => (process.env.APP_URL || 'http://127.0.0.1:4317').replace(/\/$/, '');
/** @returns {any} */
export function database() {
  if(localMode())return localDatabase();
  if (!authConfigured()) throw new AppError('Accounts are not connected yet. Please try again after setup is complete.',503);
  return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function dbResult(result) {
  if (result.error) {
    const e=result.error;
    if(e.code==='23505') throw new AppError('This stock or watchlist name already exists.',409);
    if(e.code==='P0002') throw new AppError(e.message,404);
    if(e.code==='P0001') throw new AppError(e.message,400);
    console.error('Database operation failed:',e.code,e.message);
    throw new AppError('Could not save or load your data. Please try again.',503);
  }
  return result.data;
}
export async function requireUser(request) {
  if(localMode())return {db:localDatabase(),user:await localUser(request)};
  const bearer=request.headers.get('authorization');
  if(!bearer?.startsWith('Bearer ')) throw new AppError('Please sign in to continue.',401);
  const db=database();
  const {data,error}=await db.auth.getUser(bearer.slice(7));
  if(error||!data.user||data.user.is_anonymous) throw new AppError('Your session expired. Please sign in again.',401);
  if(!data.user.email_confirmed_at) throw new AppError('Verify your email before using your watchlists.',403);
  const user=data.user;
  dbResult(await db.rpc('wl_ensure_profile',{p_user:user.id,p_name:String(user.user_metadata?.full_name || user.user_metadata?.name || 'Member'),p_trial_days:Math.max(0,Math.min(365,Number(process.env.FREE_TRIAL_DAYS)||0))}));
  return {db,user};
}
export async function rate(db,key,max=60,seconds=60) {
  if(!dbResult(await db.rpc('wl_rate',{p_key:key,p_max:max,p_seconds:seconds}))) throw new AppError('Too many updates. Please wait a moment and try again.',429);
}
export function planFor() {
  return {...OPEN_PLAN};
}
export async function ownerList(db,userId,listId) {
  if(typeof listId!=='string'||! /^[0-9a-f-]{36}$/i.test(listId)) throw new AppError('Watchlist not found.',404);
  const list=dbResult(await db.from('wl_watchlists').select('*').eq('id',listId).eq('owner_id',userId).maybeSingle());
  if(!list) throw new AppError('Watchlist not found or you do not own it.',404);
  return list;
}
const inFlight=new Map();
export async function cachedQuote(db,symbol) {
  const saved=dbResult(await db.from('wl_quotes').select('*').eq('symbol',symbol).maybeSingle());
  if(saved&&Date.now()-Date.parse(saved.fetched_at)<60_000) return saved;
  if(inFlight.has(symbol)) return inFlight.get(symbol);
  const operation=(async()=>{
    let row;
    try { const quote=await getQuote(symbol);row={symbol,quote,fetched_at:new Date().toISOString(),error:null}; }
    catch(error){ if(!saved) throw error; row={...saved,fetched_at:new Date().toISOString(),error:error.message}; }
    try{dbResult(await db.from('wl_quotes').upsert(row));}catch(error){if(saved)return saved;throw error;}return row;
  })();
  inFlight.set(symbol,operation);
  try{return await operation;}finally{inFlight.delete(symbol);}
}
export function stockView(stock,cached) {
  const base=stock.snapshot;
  const fresh=cached?.quote;
  const comparable=fresh && fresh.currency===base.currency && Date.parse(fresh.quoteTime)>=Date.parse(base.quoteTime);
  const current=comparable?fresh:base;
  return {quantity:stock.quantity===null||stock.quantity===undefined?null:Number(stock.quantity),costPerShare:stock.cost_per_share===null||stock.cost_per_share===undefined?null:Number(stock.cost_per_share),acquiredAt:stock.acquired_at||null,notes:stock.notes||'',id:stock.id,symbol:stock.symbol,companyName:base.companyName,currency:base.currency,exchange:base.exchange,addedAt:stock.added_at,addedPrice:base.price,initialQuoteTime:base.quoteTime,currentPrice:current.price,quoteTime:current.quoteTime,checkedAt:current.checkedAt,quoteError:cached?.error || (fresh&&!comparable?'Latest quote could not be compared. Starting quote is shown.':null)};
}
export async function listViews(db,lists,refresh=false) {
  if(!lists.length)return [];
  const stocks=dbResult(await db.from('wl_stocks').select('*').in('watchlist_id',lists.map(l=>l.id)).order('added_at').order('id'));
  const symbols=[...new Set(stocks.map(s=>s.symbol))];
  if(refresh){let i=0;await Promise.all(Array.from({length:Math.min(4,symbols.length)},async()=>{while(i<symbols.length){try{await cachedQuote(db,symbols[i++]);}catch{/* Preserve baseline when provider is unavailable. */}}}));}
  const quotes=symbols.length?dbResult(await db.from('wl_quotes').select('*').in('symbol',symbols)):[];
  const lookup=new Map(quotes.map(q=>[q.symbol,q]));
  return lists.map(l=>({id:l.id,name:l.name,mode:l.mode||'basic',createdAt:l.created_at,shareToken:l.share_token,role:'owner',stocks:stocks.filter(s=>s.watchlist_id===l.id).map(s=>stockView(s,lookup.get(s.symbol)))}));
}
export async function accountState(db,user,refresh=false) {
  const profile=dbResult(await db.from('wl_profiles').select('*').eq('id',user.id).single());
  const lists=dbResult(await db.from('wl_watchlists').select('*').eq('owner_id',user.id).order('created_at').order('id'));
  return {version:2,updatedAt:new Date().toISOString(),user:{id:user.id,name:profile.display_name,email:user.email,analytics:canViewAnalytics(user.email),local:localMode(),country:profile.country_code,hasBilling:!!profile.stripe_customer_id},plan:planFor(profile),watchlists:await listViews(db,lists,refresh)};
}
export async function importGuestLists(db,user,lists){
  if(!Array.isArray(lists))throw new AppError('Invalid request.');
  let state=await accountState(db,user);
  for(const raw of lists.slice(0,state.plan.maxLists)){
    const name=String(raw?.name||'').trim().slice(0,60)||'My watchlist';
    const stocks=Array.isArray(raw?.stocks)?raw.stocks:[];
    let target=state.watchlists.find(list=>!list.stocks.length);
    if(!target){
      if(state.watchlists.length>=state.plan.maxLists)target=state.watchlists[0];
      else{
        state=await accountAction(db,user,{action:'createList',name,mode:'advanced'});
        target=[...state.watchlists].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
      }
    }else if(name&&name!==target.name){
      state=await accountAction(db,user,{action:'renameList',listId:target.id,name});
      target=state.watchlists.find(list=>list.id===target.id)||target;
    }
    if(!target)continue;
    for(const stock of stocks){
      const list=state.watchlists.find(item=>item.id===target.id);
      if(!list||list.stocks.length>=state.plan.maxStocks)break;
      try{
        const symbol=normalizeTicker(stock.symbol);
        if(list.stocks.some(item=>item.symbol===symbol))continue;
        state=await accountAction(db,user,{action:'addStock',listId:target.id,ticker:symbol,quantity:stock.quantity,costPerShare:stock.costPerShare,acquiredAt:stock.acquiredAt,notes:stock.notes||''});
      }catch{/* Keep remaining guest stocks if one ticker cannot be quoted. */}
    }
  }
  return state;
}
export async function accountAction(db,user,input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('Invalid request.');
  if(input.action==='refresh')return accountState(db,user,true);
  if(input.action==='importGuest')return importGuestLists(db,user,input.lists);
  const allowed=['createList','renameList','deleteList','addStock','removeStock','shareList','revokeShare','convertList','initializePosition'];
  if(!allowed.includes(input.action))throw new AppError('Unknown action.');
  if(input.action!=='createList')await ownerList(db,user.id,input.listId);
  let quote=null;
  if(input.action==='addStock') {
    const result=await cachedQuote(db,normalizeTicker(input.ticker));
    if(result.error)throw new AppError('A current quote is unavailable. Please try adding this stock again shortly.',502);
    quote=result.quote;
    const existing=dbResult(await db.from('wl_stocks').select('snapshot').eq('watchlist_id',input.listId));
    try{assertQuoteCurrency(quote.currency,existing.map(row=>({currency:row.snapshot?.currency})));}
    catch(error){throw new AppError(error.message);}
  }
  const hasPosition=input.quantity!==undefined&&input.quantity!==null&&input.quantity!=='';
  dbResult(await db.rpc('wl_advanced_action',{p_user:user.id,p_action:input.action,p_list:input.listId||null,p_name:input.name||null,p_symbol:quote?.symbol||null,p_quote:quote,p_stock:input.stockId||null,p_token:input.action==='shareList'?randomBytes(32).toString('base64url'):null,p_mode:'advanced',p_quantity:hasPosition?input.quantity:null,p_cost:hasPosition?(input.costPerShare??quote?.price??null):null,p_acquired:hasPosition?(input.acquiredAt||new Date().toISOString()):null,p_notes:String(input.notes||'').slice(0,500)}));
  if(localMode())await exportLocalData();
  return accountState(db,user);
}
export async function sharedState(token) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new AppError('This link is invalid or has been revoked.',404);
  const db=database();
  const list=dbResult(await db.from('wl_watchlists').select('*').eq('share_token',token).maybeSingle());
  if(!list)throw new AppError('This link is invalid or has been revoked.',404);
  await rate(db,'share:'+list.id,120);
  const [view]=await listViews(db,[list],true);
  // Share tokens grant read access only. Do not leak email, user ID or billing data.
  const {shareToken,...safe}=view;
  return {...safe,role:'viewer'};
}
