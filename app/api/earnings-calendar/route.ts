import {earningsWeek} from '@/server/earnings-calendar.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';

export async function GET(request:Request){
  try{
    publicRate(request,'earnings-calendar',40,60);
    const week=new URL(request.url).searchParams.get('week')||'';
    const data=await earningsWeek(week);
    const complete=data.days.every((day:{status:string})=>day.status==='ok');
    return publicJson(data,complete?900:60);
  }catch(e){return failure(e);}
}
