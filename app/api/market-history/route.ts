import {historicalMarketHistory,marketHistory} from '@/server/market-history.mjs';
import {failure,publicJson,publicRate} from '@/server/http.mjs';

export async function GET(request:Request){
  try{
    publicRate(request,'market-history',30,60);
    const params=new URL(request.url).searchParams;
    const range=params.get('range')||'ytd';
    const offset=params.has('offset')?Number(params.get('offset')):0;
    const view=params.get('view');
    return publicJson(await (view==='history-candidates'?historicalMarketHistory(range,offset):marketHistory(range,offset)),300);
  }catch(error){return failure(error);}
}
