import {earningsWeek} from '@/server/earnings-calendar.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';

export async function GET(request:Request){
  try{
    publicRate(request,'earnings-calendar',40,60);
    const week=new URL(request.url).searchParams.get('week')||'';
    return publicJson(await earningsWeek(week),1800);
  }catch(e){return failure(e);}
}
