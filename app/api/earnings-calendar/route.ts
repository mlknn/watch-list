import {earningsWeek} from '@/server/earnings-calendar.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';

export async function GET(request:Request){
  try{
    publicRate(request,'earnings-calendar',40,60);
    const week=new URL(request.url).searchParams.get('week')||'';
    const data=await earningsWeek(week);
    const filled=data.weeks.some(block=>block.days.some(day=>day.companies.length));
    return publicJson(data,filled?300:30);
  }catch(e){return failure(e);}
}
