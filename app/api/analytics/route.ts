import {trackAnalytics,requireAnalytics,analyticsSummary} from '@/server/analytics.mjs';
import {json,failure,body,publicRate} from '@/server/http.mjs';

export const dynamic='force-dynamic';

export async function POST(request:Request){
  try{
    publicRate(request,'analytics',40,60);
    const input=await body(request,2048);
    return json(await trackAnalytics(String(input.event||''),String(input.visitor||'')));
  }catch(e){return failure(e);}
}

export async function GET(request:Request){
  try{
    const {db}=await requireAnalytics(request);
    const days=Math.min(90,Math.max(1,Number(new URL(request.url).searchParams.get('days'))||14));
    return json(await analyticsSummary(db,days));
  }catch(e){return failure(e);}
}
