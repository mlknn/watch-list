import {createHash} from 'node:crypto';
import {AppError} from './quotes.mjs';
import {authConfigured,database,dbResult,requireUser} from './cloud.mjs';
import {canViewAnalytics} from './analytics-access.mjs';

export {canViewAnalytics};
export const ANALYTICS_EVENTS=['visit','dashboard','stock_search','watchlist_created','signup'];

export function visitorHash(visitor){
  const raw=String(visitor||'').trim().toLowerCase();
  if(!/^[0-9a-f-]{8,64}$/.test(raw))throw new AppError('Invalid visitor.',400);
  return createHash('sha256').update('wl-analytics:'+raw).digest('hex').slice(0,32);
}

export async function trackAnalytics(event,visitor){
  if(!ANALYTICS_EVENTS.includes(event))throw new AppError('Unknown event.',400);
  if(!authConfigured())return {ok:true,stored:false};
  dbResult(await database().rpc('wl_analytics_track',{p_event:event,p_visitor:visitorHash(visitor)}));
  return {ok:true,stored:true};
}

export async function requireAdmin(request){
  const {db,user}=await requireUser(request);
  if(!canViewAnalytics(user.email))throw new AppError('This page is only available to the site owner.',403);
  return {db,user};
}

export async function analyticsSummary(db,days=14){
  const rows=dbResult(await db.rpc('wl_analytics_summary',{p_days:days}));
  return {days:Array.isArray(rows)?rows:[]};
}
