import {marketGroup} from '@/server/market.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';
export async function GET(request:Request){
  try{
    publicRate(request,'market',120,60);
    const params=new URL(request.url).searchParams;
    const group=params.get('group')||'';
    const offset=params.has('offset')?Number(params.get('offset')):null;
    return publicJson(await marketGroup(group,offset),30);
  }catch(e){return failure(e);}
}
