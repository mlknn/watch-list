import {marketGroup} from '@/server/market.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';
export async function GET(request:Request){
  try{
    publicRate(request,'market',120,60);
    const group=new URL(request.url).searchParams.get('group')||'';
    return publicJson(await marketGroup(group),30);
  }catch(e){return failure(e);}
}
