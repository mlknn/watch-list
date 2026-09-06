import {requireUser,dbResult} from './cloud.mjs';
import {normalizeTicker,AppError} from './quotes.mjs';
export async function requireStockAccess(request,value,authenticate=requireUser){
 const {db,user}=await authenticate(request);const symbol=normalizeTicker(value);
 const lists=dbResult(await db.from('wl_watchlists').select('id').eq('owner_id',user.id));
 if(!lists.length)throw new AppError('Add this stock to one of your watchlists to view its details.',403);
 const stocks=dbResult(await db.from('wl_stocks').select('id').in('watchlist_id',lists.map(l=>l.id)).eq('symbol',symbol));
 if(!stocks.length)throw new AppError('Add this stock to one of your watchlists to view its details.',403);
 return {db,user,symbol};
}
