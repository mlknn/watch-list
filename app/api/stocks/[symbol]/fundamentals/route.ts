import {getFundamentals} from '@/server/fundamentals.mjs';
import {normalizeTicker} from '@/server/quotes.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{symbol:string}>}){
  try{
    publicRate(request,'fundamentals',60,60);
    return publicJson(await getFundamentals(normalizeTicker((await params).symbol)),120);
  }catch(e){return failure(e);}
}
