import {requireUser,dbResult,rate} from './cloud.mjs';
import {AppError,getQuote,normalizeTicker} from './quotes.mjs';
import {quotesForSymbols} from './market.mjs';

export async function favoritesForRequest(request){
  try{
    const {db,user}=await requireUser(request);
    await rate(db,'favorites-read:'+user.id,60);
    return await listFavorites(db,user);
  }catch(e){
    if(e instanceof AppError&&(e.status===401||e.status===403))return {signedIn:false,favorites:[]};
    throw e;
  }
}

export async function listFavorites(db,user){
  const rows=dbResult(await db.from('wl_dashboard_favorites').select('symbol,created_at').eq('user_id',user.id).order('created_at'))||[];
  const stocks=rows.length?await quotesForSymbols(rows.map(row=>row.symbol)):[];
  const bySymbol=new Map(stocks.map(row=>[row.symbol,row]));
  return {signedIn:true,favorites:rows.map(row=>bySymbol.get(row.symbol)||{symbol:row.symbol,chart:null,error:null})};
}

export async function toggleFavorite(request,input){
  const {db,user}=await requireUser(request);
  await rate(db,'favorites-write:'+user.id,30);
  const add=input?.favorite===true;
  const symbol=normalizeTicker(input?.symbol);
  if(add)await getQuote(symbol);
  dbResult(await db.rpc('wl_favorite_action',{p_user:user.id,p_action:add?'add':'remove',p_symbol:symbol}));
  return listFavorites(db,user);
}
