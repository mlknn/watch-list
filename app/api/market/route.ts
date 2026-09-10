import {marketGroup} from '@/server/market.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(request:Request){
  try{
    const group=new URL(request.url).searchParams.get('group')||'';
    return json(await marketGroup(group));
  }catch(e){return failure(e);}
}
