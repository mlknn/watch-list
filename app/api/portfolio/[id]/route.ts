import {requireUser,ownerList,listViews,rate} from '@/server/cloud.mjs';
import {portfolioHistory} from '@/server/portfolio.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const {db,user}=await requireUser(request);await rate(db,'portfolio:'+user.id,30);const list=await ownerList(db,user.id,(await params).id);const [view]=await listViews(db,[list],true);return json(await portfolioHistory(view,new URL(request.url).searchParams.get('range')||'1mo'));}catch(e){return failure(e);}}
