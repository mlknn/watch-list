import {getChart} from '@/server/charts.mjs';
import {normalizeTicker} from '@/server/quotes.mjs';
import {json,failure,publicRate} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{symbol:string}>}){
  try{
    publicRate(request,'chart',120,60);
    const symbol=normalizeTicker((await params).symbol);
    return json(await getChart(symbol,new URL(request.url).searchParams.get('range')||'1d'));
  }catch(e){return failure(e);}
}
