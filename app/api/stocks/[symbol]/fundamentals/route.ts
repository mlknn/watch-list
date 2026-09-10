import {getFundamentals} from '@/server/fundamentals.mjs';
import {normalizeTicker} from '@/server/quotes.mjs';
import {json,failure,publicRate} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{symbol:string}>}){
  try{
    publicRate(request,'fundamentals',60,60);
    return json(await getFundamentals(normalizeTicker((await params).symbol)));
  }catch(e){return failure(e);}
}
