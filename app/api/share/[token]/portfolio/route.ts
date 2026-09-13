import {sharedState} from '@/server/cloud.mjs';
import {portfolioHistory} from '@/server/portfolio.mjs';
import {json,failure,publicRate} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){try{publicRate(request,'share-portfolio',40,60);const list=await sharedState((await params).token);return json(await portfolioHistory(list,new URL(request.url).searchParams.get('range')||'1mo'));}catch(e){return failure(e);}}
