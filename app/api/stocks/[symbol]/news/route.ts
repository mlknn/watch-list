import {getStockNews} from '@/server/news.mjs';
import {normalizeTicker} from '@/server/quotes.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';

export async function GET(request:Request,{params}:{params:Promise<{symbol:string}>}){
  try{
    publicRate(request,'news',60,60);
    return publicJson(await getStockNews(normalizeTicker((await params).symbol)),60);
  }catch(e){return failure(e);}
}
