import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { AppError, getQuote, normalizeTicker } from './quotes.mjs';

export const authConfigured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const origin = () => (process.env.APP_URL || 'http://127.0.0.1:4317').replace(/\/$/, '');
export function database() {
  if (!authConfigured()) throw new AppError('Accounts are not connected yet. Please try again after setup is complete.',503);
  return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function dbResult(result) {
  if (result.error) {
    const e=result.error;
    if(e.code==='23505') throw new AppError('This stock or watchlist name already exists.',409);
    if(e.code==='P0002') throw new AppError(e.message,404);
    if(e.code==='P0001') throw new AppError(e.message,400);
    console.error('Database operation failed:',e.code);
    throw new AppError('Could not save or load your data. Please try again.',503);
  }
  return result.data;
}
export async function requireUser(request) {
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
export function planFor(profile, now=Date.now()) {
  const pro=profile.subscription_status==='active'&&Date.parse(profile.pro_until)>now;
  return {id:pro?'pro':'free',maxLists:pro?10:1,maxStocks:pro?50:10,pageSize:25,trialEndsAt:profile.trial_ends_at,expired:!pro&&!!profile.trial_ends_at&&Date.parse(profile.trial_ends_at)<=now};
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
    dbResult(await db.from('wl_quotes').upsert(row));return row;
  })();
  inFlight.set(symbol,operation);
  try{return await operation;}finally{inFlight.delete(symbol);}
}
export function stockView(stock,cached) {
  const base=stock.snapshot;
  const fresh=cached?.quote;
  const comparable=fresh && fresh.currency===base.currency && Date.parse(fresh.quoteTime)>=Date.parse(base.quoteTime);
  const current=comparable?fresh:base;
  return {id:stock.id,symbol:stock.symbol,companyName:base.companyName,currency:base.currency,exchange:base.exchange,addedAt:stock.added_at,addedPrice:base.price,initialQuoteTime:base.quoteTime,currentPrice:current.price,quoteTime:current.quoteTime,checkedAt:current.checkedAt,quoteError:cached?.error || (fresh&&!comparable?'Latest quote could not be compared. Starting quote is shown.':null)};
}
export async function listViews(db,lists,refresh=false) {
  if(!lists.length)return [];
  const stocks=dbResult(await db.from('wl_stocks').select('*').in('watchlist_id',lists.map(l=>l.id)).order('added_at').order('id'));
  const symbols=[...new Set(stocks.map(s=>s.symbol))];
  if(refresh){let i=0;await Promise.all(Array.from({length:Math.min(4,symbols.length)},async()=>{while(i<symbols.length){try{await cachedQuote(db,symbols[i++]);}catch{/* Preserve baseline when provider is unavailable. */}}}));}
  const quotes=symbols.length?dbResult(await db.from('wl_quotes').select('*').in('symbol',symbols)):[];
  const lookup=new Map(quotes.map(q=>[q.symbol,q]));
  return lists.map(l=>({id:l.id,name:l.name,createdAt:l.created_at,shareToken:l.share_token,role:'admin',stocks:stocks.filter(s=>s.watchlist_id===l.id).map(s=>stockView(s,lookup.get(s.symbol)))}));
}
export async function accountState(db,user,refresh=false) {
  const profile=dbResult(await db.from('wl_profiles').select('*').eq('id',user.id).single());
  const lists=dbResult(await db.from('wl_watchlists').select('*').eq('owner_id',user.id).order('created_at').order('id'));
  return {version:2,updatedAt:new Date().toISOString(),user:{id:user.id,name:profile.display_name,email:user.email,country:profile.country_code,hasBilling:!!profile.stripe_customer_id},plan:planFor(profile),watchlists:await listViews(db,lists,refresh)};
}
export async function accountAction(db,user,input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('Invalid request.');
  if(input.action==='refresh')return accountState(db,user,true);
  const allowed=['createList','renameList','deleteList','addStock','removeStock','shareList','revokeShare'];
  if(!allowed.includes(input.action))throw new AppError('Unknown action.');
  if(input.action!=='createList')await ownerList(db,user.id,input.listId);
  let quote=null;
  if(input.action==='addStock') {
    const result=await cachedQuote(db,normalizeTicker(input.ticker));
    if(result.error)throw new AppError('A current quote is unavailable. Please try adding this stock again shortly.',502);
    quote=result.quote;
  }
  dbResult(await db.rpc('wl_account_action',{p_user:user.id,p_action:input.action,p_list:input.listId||null,p_name:input.name||null,p_symbol:quote?.symbol||null,p_quote:quote,p_stock:input.stockId||null,p_token:input.action==='shareList'?randomBytes(32).toString('base64url'):null}));
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
