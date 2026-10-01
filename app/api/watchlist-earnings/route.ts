import {earningsSymbols,watchlistEarnings} from '@/server/watchlist-earnings.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';
export async function GET(request:Request){
  try{publicRate(request,'watchlist-earnings',12,60);return publicJson(await watchlistEarnings(earningsSymbols(new URL(request.url).searchParams.get('symbols'))),60);}
  catch(error){return failure(error);}
}
