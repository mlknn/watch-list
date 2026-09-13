import {marketGroup} from '@/server/market.mjs';
import {json,failure,publicRate} from '@/server/http.mjs';
export async function GET(request:Request){
  try{
    publicRate(request,'market',120,60);
    const group=new URL(request.url).searchParams.get('group')||'';
    return json(await marketGroup(group));
  }catch(e){return failure(e);}
}
